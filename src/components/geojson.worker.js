// 道格拉斯-普克算法简化
function simplify(coordinates, tolerance) {
    if (coordinates.length <= 2) return coordinates;
  
    const sqTolerance = tolerance * tolerance;
    
    const getSquareDistance = (p1, p2) => {
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      return dx * dx + dy * dy;
    };
  
    const getSquareSegmentDistance = (p, p1, p2) => {
      let x = p1[0], y = p1[1];
      let dx = p2[0] - x, dy = p2[1] - y;
  
      if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2[0];
          y = p2[1];
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }
      return getSquareDistance(p, [x, y]);
    };
  
    const simplifyDPStep = (points, first, last, sqTolerance, result) => {
      let maxSqDist = 0;
      let index = -1;
  
      for (let i = first + 1; i < last; i++) {
        const sqDist = getSquareSegmentDistance(
          points[i],
          points[first],
          points[last]
        );
        if (sqDist > maxSqDist) {
          maxSqDist = sqDist;
          index = i;
        }
      }
  
      if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, result);
        result.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, result);
      }
    };
  
    const result = [coordinates[0]];
    simplifyDPStep(coordinates, 0, coordinates.length - 1, sqTolerance, result);
    result.push(coordinates[coordinates.length - 1]);
    return result;
  }
  
  // 处理要素
  function processFeature(feature, tolerance) {
    const { geometry, properties } = feature;
    
    if (geometry.type === 'LineString') {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: simplify(geometry.coordinates, tolerance)
        },
        properties: properties
      };
    }
    return feature;
  }
  
  // Worker主逻辑
  self.onmessage = function(e) {
    const { geojson } = e.data;
    const validFeatures = geojson.features.filter(f => {
      // 严格验证线要素
      return f.geometry?.type === 'LineString' && 
             f.geometry.coordinates?.length >= 2 &&
             f.geometry.coordinates.every(coord => 
               Array.isArray(coord) && coord.length >= 2
             );
    });
  
    console.log(`有效线要素: ${validFeatures.length}/${geojson.features.length}`);
  
    // 分批次处理
    const batchSize = 2000;
    for (let i = 0; i < validFeatures.length; i += batchSize) {
      const batch = validFeatures.slice(i, i + batchSize).map(f => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: f.geometry.coordinates.map(coord => 
            [coord[0], coord[1], coord[2] || 0] // 标准化为三维坐标
          )
        }
      }));
      
      self.postMessage({
        batch: batch,
        progress: (i / validFeatures.length) * 100
      });
    }
    self.postMessage({ done: true });
  };