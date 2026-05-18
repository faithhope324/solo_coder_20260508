from apscheduler.schedulers.background import BackgroundScheduler
from rss_fetcher import fetch_all_feeds

scheduler = None


def init_scheduler(app):
    global scheduler

    scheduler = BackgroundScheduler(timezone='UTC')

    interval = app.config['FETCH_INTERVAL_MINUTES']

    scheduler.add_job(
        func=fetch_all_feeds,
        trigger='interval',
        minutes=interval,
        args=[app],
        id='fetch_all_feeds',
        replace_existing=True
    )

    scheduler.start()
    app.logger.info(f'Scheduler started, fetch interval: {interval} minutes')

    return scheduler


def shutdown_scheduler():
    global scheduler
    if scheduler:
        scheduler.shutdown()
