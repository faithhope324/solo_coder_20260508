from flask import render_template, request, redirect, url_for, flash, jsonify
from models import db, Article, Feed
from routes import main_bp


@main_bp.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    per_page = 20

    articles = Article.query.order_by(
        Article.published.desc()
    ).paginate(page=page, per_page=per_page)

    feeds = Feed.query.all()

    return render_template('index.html', articles=articles, feeds=feeds)


@main_bp.route('/feed/<int:feed_id>')
def feed_articles(feed_id):
    page = request.args.get('page', 1, type=int)
    per_page = 20

    feed = Feed.query.get_or_404(feed_id)
    articles = Article.query.filter_by(feed_id=feed_id).order_by(
        Article.published.desc()
    ).paginate(page=page, per_page=per_page)

    feeds = Feed.query.all()

    return render_template('index.html', articles=articles,
                         feeds=feeds, current_feed=feed)


@main_bp.route('/article/<int:article_id>/toggle-read', methods=['POST'])
def toggle_read(article_id):
    article = Article.query.get_or_404(article_id)
    article.is_read = not article.is_read
    db.session.commit()
    return jsonify({'success': True, 'is_read': article.is_read})


@main_bp.route('/mark-all-read', methods=['POST'])
def mark_all_read():
    feed_id = request.form.get('feed_id', type=int)

    if feed_id:
        Article.query.filter_by(feed_id=feed_id).update({Article.is_read: True})
        db.session.commit()
        flash('All articles in this feed marked as read', 'success')
        return redirect(url_for('main.feed_articles', feed_id=feed_id))
    else:
        Article.query.update({Article.is_read: True})
        db.session.commit()
        flash('All articles marked as read', 'success')
        return redirect(url_for('main.index'))
