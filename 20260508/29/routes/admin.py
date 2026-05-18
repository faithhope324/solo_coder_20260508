import feedparser
import requests
from flask import render_template, request, redirect, url_for, flash
from models import db, Feed
from routes import admin_bp
from rss_fetcher import fetch_feed


@admin_bp.route('/')
def admin():
    feeds = Feed.query.order_by(Feed.created_at.desc()).all()
    return render_template('admin.html', feeds=feeds)


@admin_bp.route('/add', methods=['POST'])
def add_feed():
    url = request.form.get('url', '').strip()

    if not url:
        flash('URL is required', 'error')
        return redirect(url_for('admin.admin'))

    existing = Feed.query.filter_by(url=url).first()
    if existing:
        flash('Feed already exists', 'error')
        return redirect(url_for('admin.admin'))

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        parsed = feedparser.parse(response.content)

        if parsed.bozo and not parsed.feed.get('title'):
            flash('Invalid RSS feed', 'error')
            return redirect(url_for('admin.admin'))

        title = parsed.feed.get('title', url)

        feed = Feed(title=title, url=url)
        db.session.add(feed)
        db.session.commit()

        from flask import current_app
        fetch_feed(feed.id, current_app._get_current_object())

        flash(f'Feed "{title}" added successfully', 'success')

    except Exception as e:
        flash(f'Error adding feed: {str(e)}', 'error')

    return redirect(url_for('admin.admin'))


@admin_bp.route('/delete/<int:feed_id>', methods=['POST'])
def delete_feed(feed_id):
    feed = Feed.query.get_or_404(feed_id)
    db.session.delete(feed)
    db.session.commit()
    flash(f'Feed "{feed.title}" deleted', 'success')
    return redirect(url_for('admin.admin'))


@admin_bp.route('/refresh/<int:feed_id>', methods=['POST'])
def refresh_feed(feed_id):
    feed = Feed.query.get_or_404(feed_id)
    from flask import current_app
    fetch_feed(feed.id, current_app._get_current_object())
    flash(f'Feed "{feed.title}" refreshed', 'success')
    return redirect(url_for('admin.admin'))


@admin_bp.route('/refresh-all', methods=['POST'])
def refresh_all():
    from flask import current_app
    from rss_fetcher import fetch_all_feeds
    fetch_all_feeds(current_app._get_current_object())
    flash('All feeds refreshed', 'success')
    return redirect(url_for('admin.admin'))
