import os
import math
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image


def window_partition(x, window_size):
    B, H, W, C = x.shape
    x = x.view(B, H // window_size, window_size, W // window_size, window_size, C)
    windows = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(-1, window_size, window_size, C)
    return windows


def window_reverse(windows, window_size, H, W):
    B = int(windows.shape[0] / (H * W / window_size / window_size))
    x = windows.view(B, H // window_size, W // window_size, window_size, window_size, -1)
    x = x.permute(0, 1, 3, 2, 4, 5).contiguous().view(B, H, W, -1)
    return x


class Mlp(nn.Module):
    def __init__(self, in_features, hidden_features=None, out_features=None, act_layer=nn.GELU, drop=0.):
        super().__init__()
        out_features = out_features or in_features
        hidden_features = hidden_features or in_features
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = act_layer()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(drop)

    def forward(self, x):
        x = self.fc1(x)
        x = self.act(x)
        x = self.drop(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x


class WindowAttention(nn.Module):
    def __init__(self, dim, window_size, num_heads, qkv_bias=True, attn_drop=0., proj_drop=0.):
        super().__init__()
        self.dim = dim
        self.window_size = window_size
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = head_dim ** -0.5

        self.relative_position_bias_table = nn.Parameter(
            torch.zeros((2 * window_size[0] - 1) * (2 * window_size[1] - 1), num_heads)
        )

        coords_h = torch.arange(self.window_size[0])
        coords_w = torch.arange(self.window_size[1])
        coords = torch.stack(torch.meshgrid([coords_h, coords_w], indexing='ij'))
        coords_flatten = torch.flatten(coords, 1)
        relative_coords = coords_flatten[:, :, None] - coords_flatten[:, None, :]
        relative_coords = relative_coords.permute(1, 2, 0).contiguous()
        relative_coords[:, :, 0] += self.window_size[0] - 1
        relative_coords[:, :, 1] += self.window_size[1] - 1
        relative_coords[:, :, 0] *= 2 * self.window_size[1] - 1
        relative_position_index = relative_coords.sum(-1)
        self.register_buffer("relative_position_index", relative_position_index)

        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)

        nn.init.trunc_normal_(self.relative_position_bias_table, std=.02)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, mask=None):
        B_, N, C = x.shape
        qkv = self.qkv(x).reshape(B_, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        q = q * self.scale
        attn = (q @ k.transpose(-2, -1))

        relative_position_bias = self.relative_position_bias_table[self.relative_position_index.view(-1)].view(
            self.window_size[0] * self.window_size[1], self.window_size[0] * self.window_size[1], -1)
        relative_position_bias = relative_position_bias.permute(2, 0, 1).contiguous()
        attn = attn + relative_position_bias.unsqueeze(0)

        if mask is not None:
            nW = mask.shape[0]
            attn = attn.view(B_ // nW, nW, self.num_heads, N, N) + mask.unsqueeze(1).unsqueeze(0)
            attn = attn.view(-1, self.num_heads, N, N)
            attn = self.softmax(attn)
        else:
            attn = self.softmax(attn)

        attn = self.attn_drop(attn)

        x = (attn @ v).transpose(1, 2).reshape(B_, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        return x


class SwinTransformerBlock(nn.Module):
    def __init__(self, dim, input_resolution, num_heads, window_size=7, shift_size=0,
                 mlp_ratio=4., qkv_bias=True, drop=0., attn_drop=0., act_layer=nn.GELU):
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.num_heads = num_heads
        self.window_size = window_size
        self.shift_size = shift_size
        self.mlp_ratio = mlp_ratio

        self.norm1 = nn.LayerNorm(dim)
        self.attn = WindowAttention(
            dim, window_size=(self.window_size, self.window_size), num_heads=num_heads,
            qkv_bias=qkv_bias, attn_drop=attn_drop, proj_drop=drop)

        self.norm2 = nn.LayerNorm(dim)
        mlp_hidden_dim = int(dim * mlp_ratio)
        self.mlp = Mlp(in_features=dim, hidden_features=mlp_hidden_dim, act_layer=act_layer, drop=drop)

    def forward(self, x, x_size):
        H, W = x_size
        B, L, C = x.shape

        shortcut = x
        x = self.norm1(x)
        x = x.view(B, H, W, C)

        if self.shift_size > 0:
            shifted_x = torch.roll(x, shifts=(-self.shift_size, -self.shift_size), dims=(1, 2))
        else:
            shifted_x = x

        x_windows = window_partition(shifted_x, self.window_size)
        x_windows = x_windows.view(-1, self.window_size * self.window_size, C)

        attn_windows = self.attn(x_windows, mask=None)
        attn_windows = attn_windows.view(-1, self.window_size, self.window_size, C)
        shifted_x = window_reverse(attn_windows, self.window_size, H, W)

        if self.shift_size > 0:
            x = torch.roll(shifted_x, shifts=(self.shift_size, self.shift_size), dims=(1, 2))
        else:
            x = shifted_x
        x = x.view(B, H * W, C)

        x = shortcut + x
        x = x + self.mlp(self.norm2(x))

        return x


class SwinIR(nn.Module):
    def __init__(self, in_nc=3, out_nc=3, nf=64, embed_dim=60, depths=[6, 6], num_heads=[6, 6],
                 window_size=7, mlp_ratio=4., scale=4):
        super().__init__()
        self.scale = scale

        self.conv_first = nn.Conv2d(in_nc, nf, 3, 1, 1)

        self.conv_before_upsample = nn.Sequential(
            nn.Conv2d(nf, embed_dim, 3, 1, 1),
            nn.LeakyReLU(negative_slope=0.2, inplace=True)
        )

        self.upsample = nn.Sequential(
            nn.Conv2d(embed_dim, embed_dim * 4, 3, 1, 1),
            nn.PixelShuffle(2),
            nn.LeakyReLU(negative_slope=0.2, inplace=True),
            nn.Conv2d(embed_dim, embed_dim * 4, 3, 1, 1),
            nn.PixelShuffle(2),
            nn.LeakyReLU(negative_slope=0.2, inplace=True)
        )

        self.conv_last = nn.Conv2d(embed_dim, out_nc, 3, 1, 1)

        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            nn.init.trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)
        elif isinstance(m, nn.Conv2d):
            nn.init.kaiming_normal_(m.weight, a=0.2, mode='fan_out', nonlinearity='leaky_relu')

    def forward(self, x):
        x = self.conv_first(x)
        x = self.conv_before_upsample(x)
        x = self.upsample(x)
        x = self.conv_last(x)
        return x


class SwinIRModel:
    def __init__(self, device=None):
        self.device = device or (
            torch.device("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.models = {}
        print(f"SwinIR using device: {self.device}")

    def _load_model(self, scale: int) -> SwinIR:
        if scale not in self.models:
            model = SwinIR(scale=scale)
            model.eval()
            model = model.to(self.device)
            self.models[scale] = model
        return self.models[scale]

    @torch.no_grad()
    def enhance(self, img_path: str, scale: int = 4, progress_callback=None) -> str:
        scale = max(2, min(scale, 4))
        model = self._load_model(scale)

        img = Image.open(img_path).convert("RGB")
        img_np = np.array(img).astype(np.float32) / 255.0

        if progress_callback:
            progress_callback(10)

        img_tensor = (
            torch.from_numpy(np.ascontiguousarray(img_np.transpose(2, 0, 1)))
            .float()
            .unsqueeze(0)
            .to(self.device)
        )

        if progress_callback:
            progress_callback(25)

        max_size = 600
        h, w = img_tensor.shape[2], img_tensor.shape[3]
        if max(h, w) > max_size:
            scale_factor = max_size / max(h, w)
            new_h, new_w = int(h * scale_factor), int(w * scale_factor)
            img_tensor = F.interpolate(
                img_tensor, size=(new_h, new_w), mode="bilinear", align_corners=False
            )
            if progress_callback:
                progress_callback(35)

        try:
            output = model(img_tensor)
            if progress_callback:
                progress_callback(80)
        except RuntimeError as e:
            if "out of memory" in str(e):
                torch.cuda.empty_cache()
                new_h, new_w = img_tensor.shape[2] // 2, img_tensor.shape[3] // 2
                img_tensor = F.interpolate(
                    img_tensor, size=(new_h, new_w), mode="bilinear", align_corners=False
                )
                if progress_callback:
                    progress_callback(50)
                output = model(img_tensor)
                if progress_callback:
                    progress_callback(80)
            else:
                raise e

        output = output.data.squeeze().float().cpu().clamp_(0, 1).numpy()
        output = np.transpose(output, (1, 2, 0))
        output = (output * 255.0).round().astype(np.uint8)

        if progress_callback:
            progress_callback(95)

        out_img = Image.fromarray(output, mode="RGB")

        out_dir = os.path.join(os.path.dirname(os.path.dirname(img_path)), "results")
        os.makedirs(out_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(img_path))[0]
        out_path = os.path.join(out_dir, f"{base_name}_swinir_x{scale}.png")
        out_img.save(out_path, "PNG", quality=95)

        if progress_callback:
            progress_callback(100)

        return out_path
