import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


def plot_radar_chart(rider_data):
    categories = ['速度', '服务态度', '准时率']
    values = [rider_data['speed'], rider_data['service'], rider_data['punctuality']]

    num_vars = len(categories)
    angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
    values += values[:1]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

    ax.plot(angles, values, linewidth=2, linestyle='solid', color='#FF6B35')
    ax.fill(angles, values, color='#FF6B35', alpha=0.3)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=12, fontfamily='Microsoft YaHei')

    ax.set_ylim(0, 100)
    ax.set_yticks([20, 40, 60, 80, 100])
    ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=10)
    ax.grid(True, linestyle='--', alpha=0.6)

    ax.set_title(f'骑手 {rider_data["rider_id"]} 绩效雷达图',
                 fontsize=14, fontfamily='Microsoft YaHei', pad=20)

    for i, (angle, value) in enumerate(zip(angles[:-1], values[:-1])):
        ax.annotate(f'{value}', xy=(angle, value + 3), ha='center', va='bottom',
                    fontsize=11, fontweight='bold', fontfamily='Microsoft YaHei')

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    return img_base64
