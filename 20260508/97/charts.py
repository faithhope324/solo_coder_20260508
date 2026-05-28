import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from wordcloud import WordCloud
import numpy as np

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def _find_chinese_font():
    candidates = ['SimHei', 'Microsoft YaHei', 'STHeiti', 'WenQuanYi Micro Hei',
                  'Noto Sans CJK SC', 'Source Han Sans CN']
    available = {f.name for f in font_manager.fontManager.ttflist}
    for c in candidates:
        if c in available:
            return c
    return None


_CHINESE_FONT = _find_chinese_font()


def _fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=120, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_b64


def generate_wordcloud(reason_freq):
    if not reason_freq:
        return ''

    font_path = None
    if _CHINESE_FONT:
        for f in font_manager.fontManager.ttflist:
            if f.name == _CHINESE_FONT:
                font_path = f.fname
                break

    wc = WordCloud(
        font_path=font_path,
        width=1000,
        height=550,
        background_color='white',
        max_words=40,
        max_font_size=100,
        min_font_size=18,
        colormap='viridis',
        prefer_horizontal=0.75,
        margin=20,
        relative_scaling=0.5
    )
    wc.generate_from_frequencies(reason_freq)

    fig, ax = plt.subplots(figsize=(12, 6.5))
    ax.imshow(wc, interpolation='bilinear')
    ax.axis('off')
    ax.set_title('退货原因词云', fontsize=18, fontweight='bold', pad=20)
    return _fig_to_base64(fig)


def generate_category_bar(category_data):
    if not category_data:
        return ''

    categories = [d['category'] for d in category_data]
    rates = [d['rate'] for d in category_data]
    quantities = [d['quantity'] for d in category_data]

    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

    fig, ax1 = plt.subplots(figsize=(10, 6))

    bars = ax1.bar(categories, rates, color=colors[:len(categories)],
                   edgecolor='white', linewidth=1.5, width=0.6, zorder=3)

    for bar, qty in zip(bars, quantities):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2., height + 0.5,
                f'{height:.1f}%\n({qty}件)',
                ha='center', va='bottom', fontsize=10, fontweight='bold')

    ax1.set_xlabel('产品类别', fontsize=13, fontweight='bold')
    ax1.set_ylabel('退货占比 (%)', fontsize=13, fontweight='bold')
    ax1.set_title('各品类退货率条形图', fontsize=18, fontweight='bold', pad=15)
    ax1.set_ylim(0, max(rates) * 1.3)
    ax1.grid(axis='y', alpha=0.3, linestyle='--', zorder=0)
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)

    fig.tight_layout()
    return _fig_to_base64(fig)


def generate_price_pie(price_data):
    if not price_data:
        return ''

    labels = [d['price_range'] for d in price_data]
    sizes = [d['percentage'] for d in price_data]
    quantities = [d['quantity'] for d in price_data]

    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

    fig, ax = plt.subplots(figsize=(9, 7))

    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=None,
        autopct='%1.1f%%',
        colors=colors[:len(labels)],
        startangle=140,
        pctdistance=0.75,
        wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2),
        textprops={'fontsize': 11, 'fontweight': 'bold'}
    )

    for autotext in autotexts:
        autotext.set_fontsize(10)
        autotext.set_fontweight('bold')

    legend_labels = [f'{l} ({q}件)' for l, q in zip(labels, quantities)]
    ax.legend(wedges, legend_labels, title='价格区间',
             loc='center left', bbox_to_anchor=(1, 0, 0.5, 1),
             fontsize=10, title_fontsize=12)

    ax.set_title('价格区间退货占比饼图', fontsize=18, fontweight='bold', pad=15)
    fig.tight_layout()
    return _fig_to_base64(fig)


def generate_cross_bar(cross_data):
    if not cross_data or cross_data.get('total_records', 0) == 0:
        return ''

    reason_dist = cross_data.get('reason_distribution', {})
    if not reason_dist:
        return ''

    reasons = list(reason_dist.keys())
    counts = list(reason_dist.values())

    reasons_sorted = [r for r, _ in sorted(zip(reasons, counts), key=lambda x: x[1], reverse=True)]
    counts_sorted = sorted(counts, reverse=True)

    fig, ax = plt.subplots(figsize=(10, 6))

    colors = plt.cm.Set3(np.linspace(0, 1, len(reasons_sorted)))
    bars = ax.barh(reasons_sorted, counts_sorted, color=colors,
                   edgecolor='white', linewidth=1.5, height=0.6, zorder=3)

    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.3, bar.get_y() + bar.get_height() / 2.,
                f'{int(width)}', ha='left', va='center',
                fontsize=11, fontweight='bold')

    filters = cross_data.get('filters', {})
    title_parts = []
    if filters.get('season'):
        title_parts.append(filters['season'])
    if filters.get('category'):
        title_parts.append(filters['category'])
    title_suffix = ' - '.join(title_parts) if title_parts else '全部'
    ax.set_title(f'交叉分析退货原因分布 ({title_suffix})',
                fontsize=16, fontweight='bold', pad=15)
    ax.set_xlabel('退货订单数', fontsize=13, fontweight='bold')
    ax.invert_yaxis()
    ax.grid(axis='x', alpha=0.3, linestyle='--', zorder=0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    fig.tight_layout()
    return _fig_to_base64(fig)
