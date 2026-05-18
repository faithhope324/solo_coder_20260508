import io
import pandas as pd
import networkx as nx
import plotly.graph_objects as go
import community as community_louvain
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


def build_graph(nodes_df, edges_df):
    G = nx.Graph()
    
    for _, row in nodes_df.iterrows():
        node_id = str(row['id'])
        node_name = str(row['name']) if 'name' in row else node_id
        G.add_node(node_id, name=node_name)
    
    for _, row in edges_df.iterrows():
        source = str(row['source'])
        target = str(row['target'])
        weight = float(row['weight']) if 'weight' in row else 1.0
        G.add_edge(source, target, weight=weight)
    
    return G


def detect_communities(G):
    partition = community_louvain.best_partition(G)
    return partition


def create_plotly_figure(G, partition):
    pos = nx.spring_layout(G, k=0.5, iterations=50, seed=42)
    
    degree_dict = dict(G.degree())
    
    communities = list(set(partition.values()))
    num_communities = len(communities)
    
    colors = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
        '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'
    ]
    
    node_x = []
    node_y = []
    node_sizes = []
    node_colors = []
    node_texts = []
    node_ids = []
    
    for node in G.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        
        degree = degree_dict.get(node, 0)
        node_sizes.append(15 + degree * 3)
        
        comm = partition.get(node, 0)
        node_colors.append(colors[comm % len(colors)])
        
        name = G.nodes[node].get('name', node)
        node_texts.append(f"编号: {node}<br>名称: {name}<br>度数: {degree}<br>社区: {comm}")
        node_ids.append(node)
    
    edge_x = []
    edge_y = []
    edge_widths = []
    
    for edge in G.edges(data=True):
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.append(x0)
        edge_x.append(x1)
        edge_x.append(None)
        edge_y.append(y0)
        edge_y.append(y1)
        edge_y.append(None)
        
        weight = edge[2].get('weight', 1.0)
        edge_widths.append(weight)
    
    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        line=dict(width=1, color='#888'),
        hoverinfo='none',
        mode='lines'
    )
    
    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode='markers',
        hoverinfo='text',
        text=node_texts,
        customdata=node_ids,
        marker=dict(
            showscale=False,
            size=node_sizes,
            color=node_colors,
            line_width=2,
            line_color='#fff'
        )
    )
    
    fig = go.Figure(data=[edge_trace, node_trace],
                    layout=go.Layout(
                        title=dict(text='社交网络图可视化', font=dict(size=20)),
                        showlegend=False,
                        hovermode='closest',
                        margin=dict(b=20, l=5, r=5, t=40),
                        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                        dragmode='pan',
                        height=700
                    ))
    
    return fig


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_files():
    try:
        nodes_file = request.files.get('nodesFile')
        edges_file = request.files.get('edgesFile')
        
        if not nodes_file or not edges_file:
            return jsonify({'error': '请同时上传节点文件和边文件'}), 400
        
        nodes_content = nodes_file.read().decode('utf-8')
        edges_content = edges_file.read().decode('utf-8')
        
        nodes_df = pd.read_csv(io.StringIO(nodes_content))
        edges_df = pd.read_csv(io.StringIO(edges_content))
        
        required_node_cols = ['id', 'name']
        if not all(col in nodes_df.columns for col in required_node_cols):
            return jsonify({'error': '节点文件必须包含 id 和 name 列'}), 400
        
        required_edge_cols = ['source', 'target']
        if not all(col in edges_df.columns for col in required_edge_cols):
            return jsonify({'error': '边文件必须包含 source 和 target 列'}), 400
        
        G = build_graph(nodes_df, edges_df)
        
        if len(G.nodes()) == 0:
            return jsonify({'error': '图中没有节点，请检查输入数据'}), 400
        
        partition = detect_communities(G)
        
        fig = create_plotly_figure(G, partition)
        
        graph_json = fig.to_json()
        
        stats = {
            'num_nodes': G.number_of_nodes(),
            'num_edges': G.number_of_edges(),
            'num_communities': len(set(partition.values())),
            'avg_degree': round(sum(dict(G.degree()).values()) / G.number_of_nodes(), 2)
        }
        
        return jsonify({
            'success': True,
            'graph': graph_json,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({'error': f'处理数据时发生错误: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=False, port=5000)
