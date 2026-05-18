from flask import redirect, url_for, flash, Blueprint
from app import db
from models import Post, Comment
from forms import CommentForm

bp = Blueprint('comments', __name__)


@bp.route('/post/<int:post_id>/comment', methods=['POST'])
def add_comment(post_id):
    post = Post.query.get_or_404(post_id)
    form = CommentForm()
    if form.validate_on_submit():
        comment = Comment(
            body=form.body.data,
            guest_name=form.guest_name.data,
            post_id=post.id
        )
        db.session.add(comment)
        db.session.commit()
        flash('评论发表成功！', 'success')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{field}: {error}', 'danger')
    return redirect(url_for('posts.post_detail', post_id=post_id))
