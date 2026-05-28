const descriptions = [
  '一个人在演示幻灯片前讲话',
  '山峦和蓝天的壮丽风景',
  '繁忙的城市街道上行人车辆穿梭',
  '一个人在桌前使用笔记本电脑工作',
  '一群人在会议室里开会讨论',
  '海平面上美丽的日落景象',
  '双手在键盘上打字的特写',
  '写满图表和笔记的白板',
  '一个人正在演示产品或技术',
  '显示数据趋势的图表',
  '现代风格的室内办公环境',
  '一个人边做手势边讲解',
  '多台显示器上显示代码和应用程序',
  '团队正在协作完成项目',
  '整齐排列的产品展示',
  '一个人在舞台上做主题演讲',
  '流程图或思维导图展示概念',
  '商务会议中人们握手',
  '软件界面或应用的截图',
  '团队或组织的合影'
];

const sceneTypes = [
  '演示', '户外', '城市', '工作区', '会议',
  '自然', '技术', '教育', '展示', '数据',
  '办公', '演讲', '开发', '协作', '产品',
  '活动', '规划', '商务', '软件', '团队'
];

function generateRandomDescription(frameIndex) {
  const baseDescription = descriptions[frameIndex % descriptions.length];
  const sceneType = sceneTypes[frameIndex % sceneTypes.length];
  
  const variations = [
    `${baseDescription} - 场景 ${frameIndex + 1}`,
    `${sceneType}: ${baseDescription}`,
    `关键时刻: ${baseDescription}`,
    `${baseDescription} (时间戳: ${frameIndex * 5}秒)`
  ];
  
  return variations[Math.floor(Math.random() * variations.length)];
}

function analyzeFrameContent(frameIndex) {
  const objects = ['人物', '屏幕', '座椅', '桌子', '电脑', '文档', '白板'];
  const selectedObjects = [];
  
  for (let i = 0; i < 3; i++) {
    const obj = objects[(frameIndex + i) % objects.length];
    if (!selectedObjects.includes(obj)) {
      selectedObjects.push(obj);
    }
  }
  
  return {
    objects: selectedObjects,
    sceneType: sceneTypes[frameIndex % sceneTypes.length],
    confidence: (0.75 + Math.random() * 0.2).toFixed(2)
  };
}

async function generateImageDescriptions(taskId, frames, onProgress) {
  const result = [];
  const totalFrames = frames.length;
  
  for (let i = 0; i < frames.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
    
    const analysis = analyzeFrameContent(i);
    
    result.push({
      ...frames[i],
      index: i,
      description: generateRandomDescription(i),
      summary: `在 ${frames[i].timecode} 处，视频展示了${analysis.sceneType.toLowerCase()}场景。${generateRandomDescription(i)}`,
      keywords: [analysis.sceneType, ...analysis.objects],
      confidence: analysis.confidence,
      sceneType: analysis.sceneType,
      objects: analysis.objects
    });
    
    const progress = ((i + 1) / totalFrames) * 100;
    if (onProgress) {
      onProgress(progress);
    }
  }
  
  return result;
}

module.exports = {
  generateImageDescriptions
};