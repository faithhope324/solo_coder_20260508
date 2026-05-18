from flask import render_template, redirect, url_for, flash, request, abort, Blueprint, current_app
from flask_login import current_user, login_required
from app import db
from models import Post, Tag, Comment
from forms import PostForm, CommentForm

bp = Blueprint('posts', __name__)


@bp.route('/')
@bp.route('/index')
def index():
    page = request.args.get('page', 1, type=int)
    tag_name = request.args.get('tag')
    query = Post.query.order_by(Post.created_at.desc())
    
    if tag_name:
        tag = Tag.query.filter_by(name=tag_name).first()
        if tag:
            query = query.filter(Post.tags.contains(tag))
    
    posts = query.paginate(page=page, per_page=current_app.config['POSTS_PER_PAGE'], error_out=False)
    all_tags = Tag.query.all()
    
    return render_template('index.html', title='首页', posts=posts, current_tag=tag_name, all_tags=all_tags)


@bp.route('/post/<int:post_id>', methods=['GET', 'POST'])
def post_detail(post_id):
    post = Post.query.get_or_404(post_id)
    form = CommentForm()
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.desc()).all()
    return render_template('post.html', title=post.title, post=post, form=form, comments=comments)


@bp.route('/post/create', methods=['GET', 'POST'])
@login_required
def create_post():
    form = PostForm()
    if form.validate_on_submit():
        post = Post(title=form.title.data, body=form.body.data, author=current_user)
        
        if form.tags.data:
            tag_names = [t.strip() for t in form.tags.data.split(',') if t.strip()]
            for name in tag_names:
                tag = Tag.query.filter_by(name=name).first()
                if not tag:
                    tag = Tag(name=name)
                    db.session.add(tag)
                post.tags.append(tag)
        
        db.session.add(post)
        db.session.commit()
        flash('文章发布成功！', 'success')
        return redirect(url_for('posts.post_detail', post_id=post.id))
    return render_template('create_post.html', title='发布文章', form=form)


@bp.route('/post/<int:post_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author != current_user:
        abort(403)
    
    form = PostForm()
    if form.validate_on_submit():
        post.title = form.title.data
        post.body = form.body.data
        
        post.tags.clear()
        if form.tags.data:
            tag_names = [t.strip() for t in form.tags.data.split(',') if t.strip()]
            for name in tag_names:
                tag = Tag.query.filter_by(name=name).first()
                if not tag:
                    tag = Tag(name=name)
                    db.session.add(tag)
                post.tags.append(tag)
        
        db.session.commit()
        flash('文章已更新！', 'success')
        return redirect(url_for('posts.post_detail', post_id=post.id))
    elif request.method == 'GET':
        form.title.data = post.title
        form.body.data = post.body
        form.tags.data = ', '.join([tag.name for tag in post.tags])
    
    return render_template('edit_post.html', title='编辑文章', form=form, post=post)


@bp.route('/post/<int:post_id>/delete', methods=['POST'])
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author != current_user:
        abort(403)
    
    db.session.delete(post)
    db.session.commit()
    flash('文章已删除。', 'info')
    return redirect(url_for('posts.index'))


@bp.route('/user/<username>')
def user_posts(username):
    from models import User
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    posts = Post.query.filter_by(author=user).order_by(Post.created_at.desc()).paginate(
        page=page, per_page=current_app.config['POSTS_PER_PAGE'], error_out=False)
    return render_template('user_posts.html', title=f'{username} 的文章', user=user, posts=posts)
