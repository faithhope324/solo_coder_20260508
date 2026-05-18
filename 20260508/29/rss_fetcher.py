import feedparser
import requests
from datetime import datetime
from models import db, Feed, Article


def parse_datetime(entry):
    for key in ['published_parsed', 'updated_parsed', 'created_parsed']:
        if key in entry and entry[key] is not None:
            try:
                return datetime(*entry[key][:6])
            except (TypeError, ValueError):
                continue
    return datetime.utcnow()


def fetch_feed(feed_id, app):
    with app.app_context():
        feed = Feed.query.get(feed_id)
        if not feed:
            return

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)'
            }
            response = requests.get(feed.url, headers=headers, timeout=30)
            response.raise_for_status()

            parsed = feedparser.parse(response.content)

            if parsed.feed.get('title'):
                feed.title = parsed.feed.title

            new_count = 0
            for entry in parsed.entries[:50]:
                title = entry.get('title', 'No Title')
                link = entry.get('link', '')
                summary = entry.get('summary', entry.get('description', ''))
                published = parse_datetime(entry)

                if not link:
                    continue

                existing = Article.query.filter_by(
                    feed_id=feed.id, link=link
                ).first()

                if not existing:
                    article = Article(
                        feed_id=feed.id,
                        title=title,
                        link=link,
                        summary=summary,
                        published=published
                    )
                    db.session.add(article)
                    new_count += 1

            feed.last_fetched = datetime.utcnow()
            db.session.commit()

            app.logger.info(
                f'Fetched feed {feed.title}: {new_count} new articles'
            )

        except Exception as e:
            app.logger.error(f'Error fetching feed {feed.url}: {str(e)}')
            db.session.rollback()


def fetch_all_feeds(app):
    with app.app_context():
        feeds = Feed.query.all()
        for feed in feeds:
            fetch_feed(feed.id, app)
