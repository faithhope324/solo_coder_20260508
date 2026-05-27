(function() {
    'use strict';

    var API_BASE = '';
    var currentPage = 1;
    var pageSize = 20;
    var totalItems = 0;
    var heatmapChart = null;
    var currentFilters = {
        startDate: null,
        endDate: null
    };

    var elements = {
        startDate: null,
        endDate: null,
        applyFilter: null,
        resetFilter: null,
        dateRangeBanner: null,
        dateRangeText: null,
        avgRating: null,
        totalReviews: null,
        avgWaitTime: null,
        avgTaste: null,
        avgService: null,
        dataSummary: null,
        distributionBars: null,
        heatmapChart: null,
        correlationInsights: null,
        wordcloudImage: null,
        totalWords: null,
        uniqueWords: null,
        wordTags: null,
        dataTableBody: null,
        paginationInfo: null,
        pageIndicator: null,
        prevPage: null,
        nextPage: null,
        wordModal: null,
        modalWordTitle: null,
        modalBody: null,
        modalClose: null
    };

    function init() {
        cacheElements();
        setupEventListeners();
        initAnimations();
        loadDateRange();
        loadAllData();
    }

    function cacheElements() {
        elements.startDate = document.getElementById('startDate');
        elements.endDate = document.getElementById('endDate');
        elements.applyFilter = document.getElementById('applyFilter');
        elements.resetFilter = document.getElementById('resetFilter');
        elements.dateRangeBanner = document.getElementById('dateRangeBanner');
        elements.dateRangeText = document.getElementById('dateRangeText');
        elements.avgRating = document.getElementById('avgRating');
        elements.totalReviews = document.getElementById('totalReviews');
        elements.avgWaitTime = document.getElementById('avgWaitTime');
        elements.avgTaste = document.getElementById('avgTaste');
        elements.avgService = document.getElementById('avgService');
        elements.dataSummary = document.getElementById('dataSummary');
        elements.distributionBars = document.getElementById('distributionBars');
        elements.heatmapChart = document.getElementById('heatmapChart');
        elements.correlationInsights = document.getElementById('correlationInsights');
        elements.wordcloudImage = document.getElementById('wordcloudImage');
        elements.totalWords = document.getElementById('totalWords');
        elements.uniqueWords = document.getElementById('uniqueWords');
        elements.wordTags = document.getElementById('wordTags');
        elements.dataTableBody = document.getElementById('dataTableBody');
        elements.paginationInfo = document.getElementById('paginationInfo');
        elements.pageIndicator = document.getElementById('pageIndicator');
        elements.prevPage = document.getElementById('prevPage');
        elements.nextPage = document.getElementById('nextPage');
        elements.wordModal = document.getElementById('wordModal');
        elements.modalWordTitle = document.getElementById('modalWordTitle');
        elements.modalBody = document.getElementById('modalBody');
        elements.modalClose = document.getElementById('modalClose');
    }

    function setupEventListeners() {
        if (elements.applyFilter) {
            elements.applyFilter.addEventListener('click', applyFilter);
        }
        if (elements.resetFilter) {
            elements.resetFilter.addEventListener('click', resetFilter);
        }
        if (elements.prevPage) {
            elements.prevPage.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    loadDataTable();
                }
            });
        }
        if (elements.nextPage) {
            elements.nextPage.addEventListener('click', function() {
                var totalPages = Math.ceil(totalItems / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    loadDataTable();
                }
            });
        }
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', closeModal);
        }
        if (elements.wordModal) {
            elements.wordModal.addEventListener('click', function(e) {
                if (e.target === elements.wordModal) {
                    closeModal();
                }
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && elements.wordModal && elements.wordModal.style.display !== 'none') {
                closeModal();
            }
        });
    }

    function initAnimations() {
        var animatedElements = document.querySelectorAll('[data-animation]');
        animatedElements.forEach(function(el, index) {
            setTimeout(function() {
                el.classList.add('animated');
            }, index * 100);
        });
    }

    function loadDateRange() {
        fetch(API_BASE + '/api/date-range')
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.code === 200 && data.data) {
                    if (elements.startDate) {
                        elements.startDate.min = data.data.min_date;
                        elements.startDate.max = data.data.max_date;
                        elements.startDate.value = data.data.min_date;
                    }
                    if (elements.endDate) {
                        elements.endDate.min = data.data.min_date;
                        elements.endDate.max = data.data.max_date;
                        elements.endDate.value = data.data.max_date;
                    }
                }
            })
            .catch(function(error) {
                console.error('加载日期范围失败:', error);
            });
    }

    function applyFilter() {
        currentFilters.startDate = elements.startDate ? elements.startDate.value : null;
        currentFilters.endDate = elements.endDate ? elements.endDate.value : null;

        if (currentFilters.startDate && currentFilters.endDate) {
            if (currentFilters.startDate > currentFilters.endDate) {
                showNotification('开始日期不能大于结束日期', 'error');
                return;
            }
        }

        updateDateRangeBanner();
        currentPage = 1;
        loadAllData();
    }

    function resetFilter() {
        currentFilters.startDate = null;
        currentFilters.endDate = null;
        if (elements.startDate) elements.startDate.value = '';
        if (elements.endDate) elements.endDate.value = '';
        if (elements.dateRangeBanner) elements.dateRangeBanner.style.display = 'none';
        currentPage = 1;
        loadAllData();
    }

    function updateDateRangeBanner() {
        if (!elements.dateRangeBanner || !elements.dateRangeText) return;

        if (currentFilters.startDate && currentFilters.endDate) {
            elements.dateRangeText.textContent = currentFilters.startDate + ' 至 ' + currentFilters.endDate;
            elements.dateRangeBanner.style.display = 'flex';
        } else {
            elements.dateRangeBanner.style.display = 'none';
        }
    }

    function loadAllData() {
        loadOverview();
        loadHeatmap();
        loadWordcloud();
        loadDataTable();
    }

    function buildQueryString() {
        var params = [];
        if (currentFilters.startDate) params.push('start=' + encodeURIComponent(currentFilters.startDate));
        if (currentFilters.endDate) params.push('end=' + encodeURIComponent(currentFilters.endDate));
        return params.length > 0 ? '?' + params.join('&') : '';
    }

    function loadOverview() {
        fetch(API_BASE + '/api/overview' + buildQueryString())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.code === 200 && data.data) {
                    updateOverview(data.data);
                }
            })
            .catch(function(error) {
                console.error('加载概览数据失败:', error);
            });
    }

    function updateOverview(stats) {
        if (elements.avgRating) animateNumber(elements.avgRating, stats.avg_rating, 1);
        if (elements.totalReviews) animateNumber(elements.totalReviews, stats.total_reviews, 0);
        if (elements.avgWaitTime) animateNumber(elements.avgWaitTime, stats.avg_wait_time, 1);
        if (elements.avgTaste) animateNumber(elements.avgTaste, stats.avg_taste, 1);
        if (elements.avgService) animateNumber(elements.avgService, stats.avg_service, 1);

        if (elements.dataSummary && stats.date_range) {
            elements.dataSummary.textContent = stats.date_range[0] + ' - ' + stats.date_range[1];
        }

        if (stats.rating_distribution) {
            updateRatingDistribution(stats.rating_distribution);
        }
    }

    function updateRatingDistribution(distribution) {
        if (!elements.distributionBars) return;

        var maxCount = 0;
        distribution.forEach(function(item) {
            if (item.count > maxCount) maxCount = item.count;
        });

        elements.distributionBars.innerHTML = '';

        distribution.forEach(function(item) {
            var heightPercent = maxCount > 0 ? (item.count / maxCount * 100) : 0;
            
            var itemEl = document.createElement('div');
            itemEl.className = 'distribution-item';
            
            var barContainer = document.createElement('div');
            barContainer.className = 'distribution-bar-container';
            
            var bar = document.createElement('div');
            bar.className = 'distribution-bar';
            bar.style.height = '0%';
            bar.setAttribute('data-count', item.count);
            
            var label = document.createElement('div');
            label.className = 'distribution-label';
            label.textContent = item.level;
            
            var percent = document.createElement('div');
            percent.className = 'distribution-percent';
            percent.textContent = item.percentage + '%';
            
            itemEl.appendChild(label);
            itemEl.appendChild(barContainer);
            itemEl.appendChild(percent);
            barContainer.appendChild(bar);
            elements.distributionBars.appendChild(itemEl);
            
            setTimeout(function() {
                bar.style.height = heightPercent + '%';
            }, 100);
        });
    }

    function animateNumber(element, target, decimals) {
        var start = 0;
        var duration = 800;
        var startTime = null;
        var isFloat = decimals > 0;

        function update(currentTime) {
            if (!startTime) startTime = currentTime;
            var progress = Math.min((currentTime - startTime) / duration, 1);
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            var current = start + (target - start) * easeProgress;
            element.textContent = isFloat ? current.toFixed(decimals) : Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    function loadHeatmap() {
        fetch(API_BASE + '/api/heatmap' + buildQueryString())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.code === 200 && data.data) {
                    renderHeatmap(data.data);
                    updateInsights(data.data.insights);
                }
            })
            .catch(function(error) {
                console.error('加载热力图数据失败:', error);
            });
    }

    function renderHeatmap(heatmapData) {
        if (!elements.heatmapChart) return;

        if (heatmapChart) {
            heatmapChart.dispose();
        }

        heatmapChart = echarts.init(elements.heatmapChart);

        var option = {
            tooltip: {
                position: 'top',
                formatter: function(params) {
                    return heatmapData.x_axis[params.data[0]] + ' × ' + heatmapData.y_axis[params.data[1]] + '<br/>相关系数: ' + params.data[2].toFixed(2);
                },
                backgroundColor: 'rgba(44, 24, 16, 0.9)',
                borderColor: '#FF6B35',
                textStyle: {
                    color: '#fff'
                }
            },
            grid: {
                top: 40,
                left: 80,
                right: 40,
                bottom: 100
            },
            xAxis: {
                type: 'category',
                data: heatmapData.x_axis,
                axisLabel: {
                    color: '#7A6B5E',
                    fontSize: 13,
                    rotate: 0
                },
                axisLine: {
                    lineStyle: {
                        color: '#E8DDD4'
                    }
                },
                axisTick: {
                    show: false
                }
            },
            yAxis: {
                type: 'category',
                data: heatmapData.y_axis,
                axisLabel: {
                    color: '#7A6B5E',
                    fontSize: 13
                },
                axisLine: {
                    lineStyle: {
                        color: '#E8DDD4'
                    }
                },
                axisTick: {
                    show: false
                }
            },
            visualMap: {
                min: -1,
                max: 1,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 0,
                text: ['正相关', '负相关'],
                textStyle: {
                    color: '#7A6B5E',
                    fontSize: 12
                },
                textGap: 20,
                inRange: {
                    color: ['#EF476F', '#FFD166', '#06D6A0']
                },
                itemWidth: 15,
                itemHeight: 100,
                padding: [10, 10, 10, 10]
            },
            series: [{
                name: '相关系数',
                type: 'heatmap',
                data: heatmapData.heatmap_data,
                label: {
                    show: true,
                    color: '#2C1810',
                    fontSize: 13,
                    fontWeight: 600,
                    formatter: function(params) {
                        return params.data[2].toFixed(2);
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(255, 107, 53, 0.5)'
                    }
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2,
                    borderRadius: 4
                }
            }]
        };

        heatmapChart.setOption(option);

        window.addEventListener('resize', function() {
            if (heatmapChart) {
                heatmapChart.resize();
            }
        });
    }

    function updateInsights(insights) {
        if (!elements.correlationInsights || !insights || insights.length === 0) return;

        elements.correlationInsights.innerHTML = '';

        insights.forEach(function(insight) {
            var item = document.createElement('div');
            item.className = 'insight-item';

            var icon = document.createElement('span');
            icon.className = 'insight-icon ' + insight.type;
            icon.textContent = insight.type === 'positive' ? '+' : '-';

            var text = document.createElement('span');
            text.textContent = insight.description;

            item.appendChild(icon);
            item.appendChild(text);
            elements.correlationInsights.appendChild(item);
        });
    }

    function loadWordcloud() {
        if (elements.wordcloudImage) {
            elements.wordcloudImage.innerHTML = '<div class="loading-spinner"></div>';
        }

        fetch(API_BASE + '/api/wordcloud' + buildQueryString())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.code === 200 && data.data) {
                    updateWordcloud(data.data);
                }
            })
            .catch(function(error) {
                console.error('加载词云数据失败:', error);
                if (elements.wordcloudImage) {
                    elements.wordcloudImage.innerHTML = '<p style="color:#A89888;">加载词云失败</p>';
                }
            });
    }

    function updateWordcloud(wordcloudData) {
        if (elements.wordcloudImage && wordcloudData.image_url) {
            var timestamp = Date.now();
            var img = document.createElement('img');
            img.src = wordcloudData.image_url + '?t=' + timestamp;
            img.alt = '词云';
            img.onerror = function() {
                this.parentElement.innerHTML = '<p style="color:#A89888;">词云图片加载失败</p>';
            };
            elements.wordcloudImage.innerHTML = '';
            elements.wordcloudImage.appendChild(img);
        }

        if (elements.totalWords) {
            animateNumber(elements.totalWords, wordcloudData.total_words, 0);
        }
        if (elements.uniqueWords) {
            animateNumber(elements.uniqueWords, wordcloudData.unique_words, 0);
        }

        if (elements.wordTags && wordcloudData.word_list) {
            elements.wordTags.innerHTML = '';
            var maxCount = 0;
            wordcloudData.word_list.slice(0, 20).forEach(function(word) {
                if (word.value > maxCount) maxCount = word.value;
            });

            wordcloudData.word_list.slice(0, 20).forEach(function(word) {
                var tag = document.createElement('span');
                tag.className = 'word-tag';
                tag.style.opacity = 0.5 + (word.value / maxCount) * 0.5;
                
                var nameSpan = document.createElement('span');
                nameSpan.textContent = word.name;
                
                var countSpan = document.createElement('span');
                countSpan.className = 'word-tag-count';
                countSpan.textContent = word.value;
                
                tag.appendChild(nameSpan);
                tag.appendChild(countSpan);

                tag.addEventListener('click', function() {
                    showWordComments(word.name, word.comments || []);
                });

                elements.wordTags.appendChild(tag);
            });
        }
    }

    function showWordComments(word, comments) {
        if (!elements.wordModal || !elements.modalWordTitle || !elements.modalBody) return;

        elements.modalWordTitle.textContent = '关键词 "' + word + '" 相关评论';

        if (comments.length === 0) {
            elements.modalBody.innerHTML = '<p style="color:#A89888; text-align:center;">暂无相关评论</p>';
        } else {
            elements.modalBody.innerHTML = '';
            comments.forEach(function(comment) {
                var commentItem = document.createElement('div');
                commentItem.className = 'comment-item';
                commentItem.textContent = comment;
                elements.modalBody.appendChild(commentItem);
            });
        }

        elements.wordModal.style.display = 'flex';
    }

    function closeModal() {
        if (elements.wordModal) {
            elements.wordModal.style.display = 'none';
        }
    }

    function loadDataTable() {
        var queryParams = [];
        if (currentFilters.startDate) queryParams.push('start=' + encodeURIComponent(currentFilters.startDate));
        if (currentFilters.endDate) queryParams.push('end=' + encodeURIComponent(currentFilters.endDate));
        queryParams.push('page=' + currentPage);
        queryParams.push('size=' + pageSize);
        
        var queryString = '?' + queryParams.join('&');

        fetch(API_BASE + '/api/data' + queryString)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.code === 200 && data.data) {
                    updateDataTable(data.data, data.total, data.page);
                }
            })
            .catch(function(error) {
                console.error('加载数据表失败:', error);
                if (elements.dataTableBody) {
                    elements.dataTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">加载失败</td></tr>';
                }
            });
    }

    function updateDataTable(data, total, page) {
        totalItems = total;
        currentPage = page;

        if (elements.dataTableBody) {
            if (data.length === 0) {
                elements.dataTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">暂无数据</td></tr>';
            } else {
                elements.dataTableBody.innerHTML = '';
                data.forEach(function(row) {
                    var tr = document.createElement('tr');
                    
                    var tdId = document.createElement('td');
                    tdId.textContent = row.review_id;
                    
                    var tdDate = document.createElement('td');
                    tdDate.textContent = row.review_date;
                    
                    var tdRating = document.createElement('td');
                    tdRating.textContent = row.rating;
                    tdRating.style.color = getRatingColor(row.rating);
                    tdRating.style.fontWeight = '600';
                    
                    var tdWait = document.createElement('td');
                    tdWait.textContent = row.wait_time + ' 分钟';
                    
                    var tdTaste = document.createElement('td');
                    tdTaste.textContent = row.taste;
                    
                    var tdService = document.createElement('td');
                    tdService.textContent = row.service;
                    
                    var tdComment = document.createElement('td');
                    tdComment.textContent = row.comment.length > 50 ? row.comment.substring(0, 50) + '...' : row.comment;
                    tdComment.title = row.comment;
                    
                    tr.appendChild(tdId);
                    tr.appendChild(tdDate);
                    tr.appendChild(tdRating);
                    tr.appendChild(tdWait);
                    tr.appendChild(tdTaste);
                    tr.appendChild(tdService);
                    tr.appendChild(tdComment);
                    
                    elements.dataTableBody.appendChild(tr);
                });
            }
        }

        if (elements.paginationInfo) {
            elements.paginationInfo.textContent = '共 ' + total + ' 条记录';
        }

        if (elements.pageIndicator) {
            var totalPages = Math.ceil(total / pageSize);
            elements.pageIndicator.textContent = '第 ' + page + ' / ' + totalPages + ' 页';
        }

        if (elements.prevPage) {
            elements.prevPage.disabled = page <= 1;
        }
        if (elements.nextPage) {
            elements.nextPage.disabled = page >= Math.ceil(total / pageSize);
        }
    }

    function getRatingColor(rating) {
        if (rating >= 4.5) return '#06D6A0';
        if (rating >= 3.5) return '#FFD166';
        if (rating >= 2.5) return '#FF8C42';
        return '#EF476F';
    }

    function showNotification(message, type) {
        var notification = document.createElement('div');
        notification.style.cssText = [
            'position: fixed',
            'top: 100px',
            'right: 32px',
            'padding: 12px 24px',
            'background: ' + (type === 'error' ? '#EF476F' : '#06D6A0'),
            'color: white',
            'border-radius: 8px',
            'box-shadow: 0 4px 16px rgba(0,0,0,0.2)',
            'z-index: 2000',
            'animation: slideIn 0.3s ease'
        ].join(';');
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(function() {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 3000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
