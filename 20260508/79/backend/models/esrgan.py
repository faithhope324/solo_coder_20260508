import os
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image


class ResidualDenseBlock_5C(nn.Module):
    def __init__(self, nf=64, gc=32, bias=True):
        super(ResidualDenseBlock_5C, self).__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1, bias=bias)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1, bias=bias)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1, bias=bias)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1, bias=bias)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1, bias=bias)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super(RRDB, self).__init__()
        self.rdb1 = ResidualDenseBlock_5C(nf, gc)
        self.rdb2 = ResidualDenseBlock_5C(nf, gc)
        self.rdb3 = ResidualDenseBlock_5C(nf, gc)

    def forward(self, x):
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, in_nc=3, out_nc=3, nf=64, nb=23, gc=32, scale=4):
        super(RRDBNet, self).__init__()
        self.scale = scale

        self.conv_first = nn.Conv2d(in_nc, nf, 3, 1, 1, bias=True)
        self.RRDB_trunk = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.trunk_conv = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)

        self.upconv1 = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
        self.upconv2 = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
        self.HRconv = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
        self.conv_last = nn.Conv2d(nf, out_nc, 3, 1, 1, bias=True)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        fea = self.conv_first(x)
        trunk = self.trunk_conv(self.RRDB_trunk(fea))
        fea = fea + trunk

        if self.scale >= 2:
            fea = self.lrelu(
                self.upconv1(F.interpolate(fea, scale_factor=2, mode="nearest"))
            )
        if self.scale >= 4:
            fea = self.lrelu(
                self.upconv2(F.interpolate(fea, scale_factor=2, mode="nearest"))
            )
        out = self.conv_last(self.lrelu(self.HRconv(fea)))
        return out


class ESRGAN:
    def __init__(self, device=None):
        self.device = device or (
            torch.device("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.models = {}
        print(f"ESRGAN using device: {self.device}")

    def _load_model(self, scale: int) -> RRDBNet:
        if scale not in self.models:
            model = RRDBNet(scale=scale)
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

        max_size = 800
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
        out_path = os.path.join(out_dir, f"{base_name}_esrgan_x{scale}.png")
        out_img.save(out_path, "PNG", quality=95)

        if progress_callback:
            progress_callback(100)

        return out_path
