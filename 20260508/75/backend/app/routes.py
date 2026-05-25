import time
from flask import Blueprint, request, jsonify
from app.services.pdf_parser import parse_pdf
from app.services.summarizer import generate_summaries
from app.services.keyword_extractor import extract_keywords

api_bp = Blueprint('api', __name__)


@api_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time()
    })


@api_bp.route('/upload', methods=['POST'])
def upload_pdf():
    """
    上传并解析PDF文件
    
    Request: multipart/form-data 包含 file 字段
    Response: JSON 包含解析后的文本
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有找到文件'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'error': '只支持PDF格式文件'
            }), 400
        
        file_bytes = file.read()
        text, page_count = parse_pdf(file_bytes, file.filename)
        
        if not text.strip():
            return jsonify({
                'success': False,
                'error': '未能从PDF中提取到文本内容，请确保PDF包含可复制的文本'
            }), 400
        
        return jsonify({
            'success': True,
            'text': text,
            'pageCount': page_count,
            'fileName': file.filename,
            'charCount': len(text)
        })
        
    except Exception as e:
        print(f"PDF上传错误: {e}")
        return jsonify({
            'success': False,
            'error': f'PDF解析失败: {str(e)}'
        }), 500


@api_bp.route('/summarize', methods=['POST'])
def summarize_text():
    """
    生成文本摘要
    
    Request Body:
    {
        "text": "需要摘要的文本",
        "models": ["bart", "t5"],
        "summaryLength": "medium"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': '缺少text参数'
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                'success': False,
                'error': '文本内容不能为空'
            }), 400
        
        models = data.get('models', ['bart', 't5'])
        if not isinstance(models, list) or len(models) == 0:
            models = ['bart', 't5']
        
        length = data.get('summaryLength', 'medium')
        if length not in ['short', 'medium', 'long']:
            length = 'medium'
        
        summaries = generate_summaries(text, models, length)
        
        return jsonify({
            'success': True,
            'originalText': text,
            'summaries': summaries,
            'totalProcessingTime': round(sum(s['processingTime'] for s in summaries), 3)
        })
        
    except Exception as e:
        print(f"摘要生成错误: {e}")
        return jsonify({
            'success': False,
            'error': f'摘要生成失败: {str(e)}'
        }), 500


@api_bp.route('/keywords', methods=['POST'])
def get_keywords():
    """
    提取关键词
    
    Request Body:
    {
        "text": "需要提取关键词的文本",
        "algorithm": "rake",
        "maxKeywords": 20
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': '缺少text参数'
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                'success': False,
                'error': '文本内容不能为空'
            }), 400
        
        algorithm = data.get('algorithm', 'rake')
        if algorithm not in ['rake', 'tfidf']:
            algorithm = 'rake'
        
        max_keywords = data.get('maxKeywords', 20)
        try:
            max_keywords = int(max_keywords)
        except (ValueError, TypeError):
            max_keywords = 20
        
        max_keywords = max(5, min(max_keywords, 50))
        
        result = extract_keywords(text, algorithm, max_keywords)
        
        return jsonify({
            'success': True,
            'originalText': text,
            'keywords': result['keywords'],
            'algorithm': result['algorithm'],
            'processingTime': result['processingTime']
        })
        
    except Exception as e:
        print(f"关键词提取错误: {e}")
        return jsonify({
            'success': False,
            'error': f'关键词提取失败: {str(e)}'
        }), 500


@api_bp.route('/analyze', methods=['POST'])
def full_analysis():
    """
    完整分析：同时生成摘要和提取关键词
    
    Request Body:
    {
        "text": "需要分析的文本",
        "summaryModels": ["bart", "t5"],
        "keywordAlgorithm": "rake",
        "summaryLength": "medium",
        "maxKeywords": 20
    }
    """
    try:
        start_time = time.time()
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': '缺少text参数'
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                'success': False,
                'error': '文本内容不能为空'
            }), 400
        
        summary_models = data.get('summaryModels', ['bart', 't5'])
        if not isinstance(summary_models, list) or len(summary_models) == 0:
            summary_models = ['bart', 't5']
        
        keyword_algorithm = data.get('keywordAlgorithm', 'rake')
        if keyword_algorithm not in ['rake', 'tfidf']:
            keyword_algorithm = 'rake'
        
        summary_length = data.get('summaryLength', 'medium')
        if summary_length not in ['short', 'medium', 'long']:
            summary_length = 'medium'
        
        max_keywords = data.get('maxKeywords', 20)
        try:
            max_keywords = int(max_keywords)
        except (ValueError, TypeError):
            max_keywords = 20
        max_keywords = max(5, min(max_keywords, 50))
        
        print(f"开始分析: 文本长度={len(text)}, 模型={summary_models}, 算法={keyword_algorithm}")
        
        summaries = generate_summaries(text, summary_models, summary_length)
        
        keyword_result = extract_keywords(text, keyword_algorithm, max_keywords)
        
        total_time = time.time() - start_time
        
        return jsonify({
            'success': True,
            'originalText': text,
            'summaries': summaries,
            'keywords': keyword_result['keywords'],
            'algorithm': keyword_result['algorithm'],
            'totalProcessingTime': round(total_time, 3)
        })
        
    except Exception as e:
        print(f"完整分析错误: {e}")
        return jsonify({
            'success': False,
            'error': f'分析失败: {str(e)}'
        }), 500


@api_bp.route('/models', methods=['GET'])
def get_models_info():
    """获取可用的模型和算法信息"""
    from app.services.summarizer import summarization_service
    from app.services.keyword_extractor import keyword_extraction_service
    
    return jsonify({
        'success': True,
        'summaryModels': summarization_service.get_available_models(),
        'keywordAlgorithms': keyword_extraction_service.get_available_algorithms()
    })
