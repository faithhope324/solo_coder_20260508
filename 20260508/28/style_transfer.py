import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms
from PIL import Image
import copy
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

cnn = None
model_loading = False
model_loaded = False
load_error = None

cnn_normalization_mean = torch.tensor([0.485, 0.456, 0.406]).to(device)
cnn_normalization_std = torch.tensor([0.229, 0.224, 0.225]).to(device)


def get_model_status():
    return {
        'loaded': model_loaded,
        'loading': model_loading,
        'error': load_error,
        'device': str(device)
    }


def get_vgg19():
    global cnn, model_loaded, model_loading, load_error
    if cnn is None:
        if model_loading:
            raise RuntimeError('模型正在加载中，请稍候...')
        model_loading = True
        try:
            cnn = models.vgg19(weights=models.VGG19_Weights.DEFAULT).features.to(device).eval()
            model_loaded = True
        except Exception as e:
            load_error = str(e)
            raise
        finally:
            model_loading = False
    return cnn

content_layers_default = ['conv_4']
style_layers_default = ['conv_1', 'conv_2', 'conv_3', 'conv_4', 'conv_5']


class Normalization(nn.Module):
    def __init__(self, mean, std):
        super(Normalization, self).__init__()
        self.mean = torch.tensor(mean).view(-1, 1, 1)
        self.std = torch.tensor(std).view(-1, 1, 1)

    def forward(self, img):
        return (img - self.mean) / self.std


class ContentLoss(nn.Module):
    def __init__(self, target):
        super(ContentLoss, self).__init__()
        self.target = target.detach()

    def forward(self, input):
        self.loss = nn.functional.mse_loss(input, self.target)
        return input


def gram_matrix(input):
    a, b, c, d = input.size()
    features = input.view(a * b, c * d)
    G = torch.mm(features, features.t())
    return G.div(a * b * c * d)


class StyleLoss(nn.Module):
    def __init__(self, target_feature):
        super(StyleLoss, self).__init__()
        self.target = gram_matrix(target_feature).detach()

    def forward(self, input):
        G = gram_matrix(input)
        self.loss = nn.functional.mse_loss(G, self.target)
        return input


def get_style_model_and_losses(normalization_mean, normalization_std,
                               style_img, content_img,
                               content_layers=content_layers_default,
                               style_layers=style_layers_default):
    cnn = get_vgg19()
    normalization = Normalization(normalization_mean, normalization_std).to(device)

    content_losses = []
    style_losses = []

    model = nn.Sequential(normalization)

    i = 0
    for layer in cnn.children():
        if isinstance(layer, nn.Conv2d):
            i += 1
            name = 'conv_{}'.format(i)
        elif isinstance(layer, nn.ReLU):
            name = 'relu_{}'.format(i)
            layer = nn.ReLU(inplace=False)
        elif isinstance(layer, nn.MaxPool2d):
            name = 'pool_{}'.format(i)
        elif isinstance(layer, nn.BatchNorm2d):
            name = 'bn_{}'.format(i)
        else:
            raise RuntimeError('Unrecognized layer: {}'.format(layer.__class__.__name__))

        model.add_module(name, layer)

        if name in content_layers:
            target = model(content_img).detach()
            content_loss = ContentLoss(target)
            model.add_module("content_loss_{}".format(i), content_loss)
            content_losses.append(content_loss)

        if name in style_layers:
            target_feature = model(style_img).detach()
            style_loss = StyleLoss(target_feature)
            model.add_module("style_loss_{}".format(i), style_loss)
            style_losses.append(style_loss)

    for i in range(len(model) - 1, -1, -1):
        if isinstance(model[i], ContentLoss) or isinstance(model[i], StyleLoss):
            break

    model = model[:(i + 1)]

    return model, style_losses, content_losses


def get_input_optimizer(input_img):
    optimizer = optim.LBFGS([input_img])
    return optimizer


def load_image(image_path, max_size=256):
    image = Image.open(image_path).convert('RGB')

    w, h = image.size
    if max(w, h) > max_size:
        if w > h:
            new_h = int(h * max_size / w)
            new_w = max_size
        else:
            new_w = int(w * max_size / h)
            new_h = max_size
        image = image.resize((new_w, new_h), Image.LANCZOS)

    loader = transforms.Compose([
        transforms.ToTensor(),
    ])

    image = loader(image).unsqueeze(0)
    return image.to(device, torch.float)


def tensor_to_image(tensor):
    image = tensor.cpu().clone()
    image = image.squeeze(0)
    image = transforms.ToPILImage()(image)
    return image


def run_style_transfer(content_img_path, style_img_path, output_path,
                       num_steps=300, style_weight=1000000, content_weight=1,
                       progress_callback=None):
    content_img = load_image(content_img_path)
    style_img = load_image(style_img_path)

    style_img = nn.functional.interpolate(style_img, size=(content_img.size(2), content_img.size(3)), mode='bilinear', align_corners=False)

    input_img = content_img.clone()

    model, style_losses, content_losses = get_style_model_and_losses(
        cnn_normalization_mean, cnn_normalization_std,
        style_img, content_img
    )

    input_img.requires_grad_(True)
    model.requires_grad_(False)

    optimizer = get_input_optimizer(input_img)

    run = [0]
    while run[0] <= num_steps:

        def closure():
            with torch.no_grad():
                input_img.clamp_(0, 1)

            optimizer.zero_grad()
            model(input_img)

            style_score = 0
            content_score = 0

            for sl in style_losses:
                style_score += sl.loss
            for cl in content_losses:
                content_score += cl.loss

            style_score *= style_weight
            content_score *= content_weight

            loss = style_score + content_score
            loss.backward()

            run[0] += 1

            if progress_callback is not None:
                progress = min(100, int(run[0] / num_steps * 100))
                progress_callback(progress, run[0], num_steps)

            return style_score + content_score

        optimizer.step(closure)

    with torch.no_grad():
        input_img.clamp_(0, 1)

    output_image = tensor_to_image(input_img)
    output_image.save(output_path)

    return output_path


def run_fast_style_transfer(content_img_path, style_img_path, output_path,
                            num_steps=200, style_weight=10000, content_weight=1,
                            progress_callback=None):
    content_img = load_image(content_img_path, max_size=512)
    style_img = load_image(style_img_path, max_size=512)

    style_img = nn.functional.interpolate(style_img, size=(content_img.size(2), content_img.size(3)), mode='bilinear', align_corners=False)

    input_img = content_img.clone()

    model, style_losses, content_losses = get_style_model_and_losses(
        cnn_normalization_mean, cnn_normalization_std,
        style_img, content_img
    )

    input_img.requires_grad_(True)
    model.requires_grad_(False)

    optimizer = optim.Adam([input_img], lr=0.03)

    for step in range(num_steps):
        optimizer.zero_grad()

        model(input_img)

        style_score = 0
        content_score = 0

        for sl in style_losses:
            style_score += sl.loss
        for cl in content_losses:
            content_score += cl.loss

        style_score *= style_weight
        content_score *= content_weight

        loss = style_score + content_score
        loss.backward()
        optimizer.step()

        with torch.no_grad():
            input_img.clamp_(0, 1)

        if progress_callback is not None:
            progress = min(100, int((step + 1) / num_steps * 100))
            progress_callback(progress, step + 1, num_steps)

    output_image = tensor_to_image(input_img)
    output_image.save(output_path)

    return output_path
