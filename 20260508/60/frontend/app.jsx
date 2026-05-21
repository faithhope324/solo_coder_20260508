const { useState } = React;

const sampleDNA1 = `>seq1
ATCGATCGATCGATCG`;

const sampleDNA2 = `>seq2
ATCGATCGAGCTAGCT`;

const sampleSequences = [
  `>seq1
ATCGATCGATCGATCG`,
  `>seq2
ATCGATCGAGCTAGCT`,
  `>seq3
ATCGAGCTAGCTAGCT`,
  `>seq4
ATCGATCGATCGTTTT`,
];

function AlignmentView({ alignment1, alignment2, matches, seq1Id, seq2Id, alignedRegions1, alignedRegions2 }) {
  const isInAlignedRegion = (idx, regions) => {
    if (!regions) return true;
    return regions.some(([start, end]) => idx >= start && idx <= end);
  };

  const renderSequence = (seq, isMatchLine = false, regions = null) => {
    return seq.split('').map((char, idx) => {
      const inAligned = isInAlignedRegion(idx, regions);

      if (isMatchLine) {
        return (
          <span key={idx} className={char === '|' ? 'char-match' : ''}>
            {char}
          </span>
        );
      }

      let className = '';
      if (!inAligned) {
        className = 'char-flank';
      } else if (char === '-') {
        className = 'char-gap';
      } else if (matches[idx] === '|') {
        className = 'char-match';
      } else {
        className = 'char-mismatch';
      }

      return (
        <span key={idx} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="alignment-view">
      <div className="alignment-row">
        <span className="alignment-label">{seq1Id}:</span>
        <span className="alignment-seq">{renderSequence(alignment1, false, alignedRegions1)}</span>
      </div>
      <div className="alignment-row">
        <span className="alignment-label"></span>
        <span className="alignment-seq matches-line">{renderSequence(matches, true)}</span>
      </div>
      <div className="alignment-row">
        <span className="alignment-label">{seq2Id}:</span>
        <span className="alignment-seq">{renderSequence(alignment2, false, alignedRegions2)}</span>
      </div>
    </div>
  );
}

function Heatmap({ matrix, labels }) {
  const getColor = (value) => {
    if (value >= 80) return 'rgb(72, 187, 120)';
    if (value >= 60) return 'rgb(246, 173, 85)';
    if (value >= 40) return 'rgb(251, 191, 36)';
    return 'rgb(252, 129, 129)';
  };

  const getTextColor = (value) => {
    return value >= 50 ? 'white' : '#2d3748';
  };

  return (
    <div className="heatmap-container">
      <div className="section-title" style={{ textAlign: 'center', marginBottom: '16px' }}>
        相似度矩阵 (%)
      </div>
      <div
        className="heatmap"
        style={{
          gridTemplateColumns: `60px repeat(${labels.length}, 1fr)`,
        }}
      >
        <div></div>
        {labels.map((label, idx) => (
          <div key={`header-${idx}`} className="heatmap-header">
            {label}
          </div>
        ))}
        {matrix.map((row, i) => (
          <React.Fragment key={`row-${i}`}>
            <div className="heatmap-row-header">{labels[i]}</div>
            {row.map((value, j) => (
              <div
                key={`cell-${i}-${j}`}
                className="heatmap-cell"
                style={{
                  backgroundColor: getColor(value),
                  color: getTextColor(value),
                }}
              >
                {value}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="heatmap-legend">
        <span style={{ color: '#fc8181' }}>低</span>
        <div className="gradient-bar"></div>
        <span style={{ color: '#48bb78' }}>高</span>
      </div>
    </div>
  );
}

function PairwiseAlignment() {
  const [sequence1, setSequence1] = useState(sampleDNA1);
  const [sequence2, setSequence2] = useState(sampleDNA2);
  const [seqType, setSeqType] = useState('auto');
  const [matchScore, setMatchScore] = useState(2);
  const [mismatchScore, setMismatchScore] = useState(-1);
  const [gapPenalty, setGapPenalty] = useState(-2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/pairwise-align', {
        sequence1,
        sequence2,
        type: seqType,
        match_score: parseInt(matchScore),
        mismatch_score: parseInt(mismatchScore),
        gap_penalty: parseInt(gapPenalty),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setSequence1(sampleDNA1);
    setSequence2(sampleDNA2);
  };

  const clearAll = () => {
    setSequence1('');
    setSequence2('');
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="section">
          <div className="section-title">📝 输入序列 (FASTA 格式或纯序列)</div>
          <div className="form-row">
            <div className="form-group">
              <label>序列 1</label>
              <textarea
                value={sequence1}
                onChange={(e) => setSequence1(e.target.value)}
                placeholder=">seq1&#10;ATCGATCG..."
              />
            </div>
            <div className="form-group">
              <label>序列 2</label>
              <textarea
                value={sequence2}
                onChange={(e) => setSequence2(e.target.value)}
                placeholder=">seq2&#10;ATCGATCG..."
              />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">⚙️ 比对参数</div>
          <div className="form-row">
            <div className="form-group">
              <label>序列类型</label>
              <select value={seqType} onChange={(e) => setSeqType(e.target.value)}>
                <option value="auto">自动检测</option>
                <option value="dna">DNA</option>
                <option value="protein">蛋白质</option>
              </select>
            </div>
            <div className="params-grid">
              <div className="param-input">
                <label>匹配得分</label>
                <input
                  type="number"
                  value={matchScore}
                  onChange={(e) => setMatchScore(e.target.value)}
                />
              </div>
              <div className="param-input">
                <label>错配得分</label>
                <input
                  type="number"
                  value={mismatchScore}
                  onChange={(e) => setMismatchScore(e.target.value)}
                />
              </div>
              <div className="param-input">
                <label>Gap 罚分</label>
                <input
                  type="number"
                  value={gapPenalty}
                  onChange={(e) => setGapPenalty(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '比对中...' : '开始比对'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={loadExample}>
            加载示例
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearAll}>
            清空
          </button>
        </div>
      </form>

      {error && <div className="error">❌ {error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>正在执行序列比对...</span>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="section-title">📊 比对结果</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">比对得分</div>
              <div className="stat-value">{result.score}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">相似度</div>
              <div className="stat-value">{result.identity}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">序列1长度</div>
              <div className="stat-value">{result.seq1_original?.length || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">序列2长度</div>
              <div className="stat-value">{result.seq2_original?.length || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">序列1 Gap数</div>
              <div className="stat-value">{result.gap_count1}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">序列2 Gap数</div>
              <div className="stat-value">{result.gap_count2}</div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">🔍 比对视图</div>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(72, 187, 120, 0.3)' }}></div>
                <span>匹配</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(252, 129, 129, 0.3)' }}></div>
                <span>错配</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(160, 174, 192, 0.1)' }}></div>
                <span>Gap</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(160, 174, 192, 0.3)' }}></div>
                <span>侧翼序列</span>
              </div>
            </div>
            <AlignmentView
              alignment1={result.alignment1}
              alignment2={result.alignment2}
              matches={result.matches}
              seq1Id={result.seq1_id}
              seq2Id={result.seq2_id}
              alignedRegions1={result.aligned_regions1}
              alignedRegions2={result.aligned_regions2}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MultipleAlignment() {
  const [sequences, setSequences] = useState(sampleSequences);
  const [seqType, setSeqType] = useState('auto');
  const [matchScore, setMatchScore] = useState(2);
  const [mismatchScore, setMismatchScore] = useState(-1);
  const [gapPenalty, setGapPenalty] = useState(-2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addSequence = () => {
    if (sequences.length < 5) {
      setSequences([...sequences, '']);
    }
  };

  const removeSequence = (index) => {
    if (sequences.length > 2) {
      setSequences(sequences.filter((_, i) => i !== index));
    }
  };

  const updateSequence = (index, value) => {
    const newSequences = [...sequences];
    newSequences[index] = value;
    setSequences(newSequences);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/multiple-align', {
        sequences,
        type: seqType,
        match_score: parseInt(matchScore),
        mismatch_score: parseInt(mismatchScore),
        gap_penalty: parseInt(gapPenalty),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setSequences(sampleSequences);
  };

  const clearAll = () => {
    setSequences(['', '', '']);
    setResult(null);
    setError(null);
  };

  const renderMSA = (alignments, sequenceIds, consensus) => {
    const renderSeq = (seq) => {
      return seq.split('').map((char, idx) => {
        let className = '';
        if (char === '-') {
          className = 'char-gap';
        } else if (consensus && char === consensus[idx]) {
          className = 'char-match';
        } else {
          className = 'char-mismatch';
        }
        return (
          <span key={idx} className={className}>
            {char}
          </span>
        );
      });
    };

    return (
      <div className="msa-container">
        {alignments.map((aln, idx) => (
          <div key={idx} className="msa-row">
            <span className="msa-label">{sequenceIds[idx]}:</span>
            <span className="msa-seq">{renderSeq(aln)}</span>
          </div>
        ))}
        {consensus && (
          <div className="msa-row consensus-row">
            <span className="msa-label consensus-label">Consensus:</span>
            <span className="msa-seq" style={{ color: '#ed8936' }}>
              {renderSeq(consensus)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="section">
          <div className="section-title">📝 输入序列 (2-5条，FASTA 格式或纯序列)</div>
          {sequences.map((seq, index) => (
            <div key={index} className="sequence-input-group">
              <div className="sequence-header">
                <label style={{ margin: 0 }}>序列 {index + 1}</label>
                {sequences.length > 2 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeSequence(index)}
                    title="移除序列"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                value={seq}
                onChange={(e) => updateSequence(index, e.target.value)}
                placeholder={`>seq${index + 1}&#10;ATCGATCG...`}
              />
            </div>
          ))}

          {sequences.length < 5 && (
            <div className="add-btn-container">
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSequence}>
                + 添加序列
              </button>
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title">⚙️ 比对参数</div>
          <div className="form-row">
            <div className="form-group">
              <label>序列类型</label>
              <select value={seqType} onChange={(e) => setSeqType(e.target.value)}>
                <option value="auto">自动检测</option>
                <option value="dna">DNA</option>
                <option value="protein">蛋白质</option>
              </select>
            </div>
            <div className="params-grid">
              <div className="param-input">
                <label>匹配得分</label>
                <input
                  type="number"
                  value={matchScore}
                  onChange={(e) => setMatchScore(e.target.value)}
                />
              </div>
              <div className="param-input">
                <label>错配得分</label>
                <input
                  type="number"
                  value={mismatchScore}
                  onChange={(e) => setMismatchScore(e.target.value)}
                />
              </div>
              <div className="param-input">
                <label>Gap 罚分</label>
                <input
                  type="number"
                  value={gapPenalty}
                  onChange={(e) => setGapPenalty(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '比对中...' : '开始多序列比对'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={loadExample}>
            加载示例
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearAll}>
            清空
          </button>
        </div>
      </form>

      {error && <div className="error">❌ {error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>正在执行多序列比对...</span>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="section-title">📊 多序列比对结果</div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">序列数量</div>
              <div className="stat-value">{result.sequence_ids?.length || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">比对长度</div>
              <div className="stat-value">{result.alignment_length || 0}</div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">🔍 比对视图</div>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(72, 187, 120, 0.3)' }}></div>
                <span>与一致性匹配</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(252, 129, 129, 0.3)' }}></div>
                <span>与一致性不同</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(160, 174, 192, 0.1)' }}></div>
                <span>Gap</span>
              </div>
            </div>
            {renderMSA(result.alignments, result.sequence_ids, result.consensus)}
          </div>

          <div className="section">
            <Heatmap
              matrix={result.similarity_matrix}
              labels={result.sequence_ids?.map((id, i) => `Seq${i + 1}`) || []}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('pairwise');

  return (
    <div className="container">
      <div className="header">
        <h1>🧬 生物序列比对系统</h1>
        <p>支持 DNA 和蛋白质序列的 Smith-Waterman 双序列比对与多序列比对</p>
      </div>
      <div className="content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'pairwise' ? 'active' : ''}`}
            onClick={() => setActiveTab('pairwise')}
          >
            双序列比对
          </button>
          <button
            className={`tab ${activeTab === 'multiple' ? 'active' : ''}`}
            onClick={() => setActiveTab('multiple')}
          >
            多序列比对
          </button>
        </div>

        {activeTab === 'pairwise' ? (
          <PairwiseAlignment />
        ) : (
          <MultipleAlignment />
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
