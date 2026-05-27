import qrcode
import io
import os
from django.conf import settings
from django.core.files.base import ContentFile
from urllib.parse import urljoin


def generate_qr_code(poll, request):
    vote_url = request.build_absolute_uri(f'/poll/{poll.id}/')
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(vote_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    
    filename = f'poll_{poll.id}_qr.png'
    
    if poll.qr_code:
        old_path = poll.qr_code.path
        if os.path.exists(old_path):
            os.remove(old_path)
    
    poll.qr_code.save(filename, ContentFile(buffer.getvalue()), save=True)
    
    return poll.qr_code.url
