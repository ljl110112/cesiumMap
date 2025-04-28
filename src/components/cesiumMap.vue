<template>
  <div id="cesiumViewer"></div>
  <div v-if="selectedFeature" class="info-box">
    <h3>路网信息</h3>
    <pre>{{ selectedFeature.properties }}</pre>
    <button @click="selectedFeature = null">关闭</button>
  </div>
  <div class="toolbar">
    <button @click="startDrawing('point')">标绘点</button>
    <button @click="startDrawing('line')">标绘线</button>
    <button @click="startDrawing('polygon')">标绘多边形</button>
    <button @click="startDrawing('circle')">标绘圆形</button>
    <button @click="startDrawing('rectangle')">标绘矩形</button>
    <button @click="startDrawing('test')">标绘流畅矩形</button>
  </div>
  <div style="position:absolute;top:40px;left:10px;z-index:9;">
    <button @click="dragClick(true)">开始拖拽</button>
    <button @click="dragClick(false)">取消拖拽</button>
  </div>
  <div class="coordinate-info">{{ coordinateInfo }}</div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { onMounted, ref, reactive } from 'vue';
import DragTool from './DragTool.js'

let viewer = null;
const selectedFeature = ref(null);
const drawingMode = ref(null);
const positions = ref([]);
const entities = ref([]);
const coordinateInfo = ref('');

const state = reactive({
  dragtool: null
})

onMounted(async () => {
  initCesium();
  state.dragtool = new DragTool({ viewer });
});

// 初始化
const initCesium = async () => {
  viewer = new Cesium.Viewer('cesiumViewer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false
  });

  var wtMapModel = new Cesium.UrlTemplateImageryProvider({
    url: "http://localhost:8888/oyzMap/wt/{z}/{x}/{reverseY}.png",
    tilingScheme: new Cesium.WebMercatorTilingScheme(),  // 使用 Web Mercator 投影
    customTags: {
      reverseY: function (imageryProvider, x, y, level) {
        // TMS 标准的 Y = (2^level - 1) - y
        return (1 << level) - 1 - y;
      }
    },
    minimumLevel: 0,
    maximumLevel: 9,
    fileExtension: 'png'
  });
  viewer.imageryLayers.addImageryProvider(wtMapModel);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(106.33, 29.34, 100000), // 设置相机位置
    duration: 3 // 飞行时间
  });

  //测试拖动数据
  viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(106.33, 29.34, 100000),
        ellipse: {
          semiMinorAxis: 10000,
          semiMajorAxis: 10000,
          material: Cesium.Color.RED.withAlpha(0.5)
        }
      });

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(106.33, 29.54, 100000),
        ellipse: {
          semiMinorAxis: 10000,
          semiMajorAxis: 10000,
          material: Cesium.Color.RED.withAlpha(0.5)
        }
      });

  var customDataSource = new Cesium.CustomDataSource('geojson');
  viewer.dataSources.add(customDataSource);

  fetch('./data/roads.geojson')
    .then(response => response.json())
    .then(geojson => {
      geojson.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
          var point = Cesium.Cartesian3.fromDegrees(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
          customDataSource.entities.add({
            position: point,
            point: {
              pixelSize: 5,
              color: Cesium.Color.YELLOW
            }
          });
        } else if (feature.geometry.type === 'Polygon') {
          var polygonHierarchy = Cesium.PolygonGeometry.createWallGeometry(feature.geometry.coordinates[0], 0);
          var wall = viewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances: new Cesium.GeometryInstance({
              geometry: polygonHierarchy,
              id: feature.properties.name // Assuming there's a name property in properties
            }),
            appearance: new Cesium.PerInstanceColorAppearance({
              flat: true,
              translucent: false,
              renderState: {
                depthTest: { enabled: true }
              }
            }),
            asynchronous: false
          }));
        }
      });
    });

  // 监听鼠标移动事件，显示经纬度
  // const mouseHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  // mouseHandler.setInputAction((movement) => {
  //   const cartesian = viewer.scene.pickPosition(movement.endPosition);
  //   if (cartesian) {
  //     const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  //     const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
  //     const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
  //     coordinateInfo.value = `经度: ${longitude}, 纬度: ${latitude}`;
  //   }
  // }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  /*
  // 支持拖动要素
  const dragHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  let draggingEntity = null;
  let originalPositions = [];
  let connectionLine = null;

  dragHandler.setInputAction((click) => {
    const pickedObject = viewer.scene.pick(click.position);
    if (pickedObject && pickedObject.id) {
      draggingEntity = pickedObject.id;
      originalPositions = [...draggingEntity.polyline?.positions.getValue() || draggingEntity.polygon?.hierarchy.getValue().positions || [draggingEntity.position.getValue()]];
      draggingEntity.polygon?.material.setValue(draggingEntity.polygon.material.getValue().withAlpha(0.3));
      draggingEntity.polyline?.material.setValue(draggingEntity.polyline.material.getValue().withAlpha(0.3));
      draggingEntity.point?.color.setValue(draggingEntity.point.color.getValue().withAlpha(0.3));
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

  dragHandler.setInputAction((movement) => {
    if (draggingEntity) {
      const newPosition = viewer.scene.pickPosition(movement.endPosition);
      if (newPosition) {
        if (draggingEntity.polyline) {
          const newPositions = originalPositions.map(pos => {
            const offset = Cesium.Cartesian3.subtract(newPosition, originalPositions[0], new Cesium.Cartesian3());
            return Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3());
          });
          draggingEntity.polyline.positions.setValue(newPositions);
        } else if (draggingEntity.polygon) {
          const newPositions = originalPositions.map(pos => {
            const offset = Cesium.Cartesian3.subtract(newPosition, originalPositions[0], new Cesium.Cartesian3());
            return Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3());
          });
          draggingEntity.polygon.hierarchy.setValue(new Cesium.PolygonHierarchy(newPositions));
        } else if (draggingEntity.position) {
          draggingEntity.position.setValue(newPosition);
        }

        if (connectionLine) {
          viewer.entities.remove(connectionLine);
        }
        connectionLine = viewer.entities.add({
          polyline: {
            positions: [originalPositions[0], newPosition],
            width: 1,
            material: Cesium.Color.RED
          }
        });
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  dragHandler.setInputAction(() => {
    if (draggingEntity) {
      draggingEntity.polygon?.material.setValue(draggingEntity.polygon.material.getValue().withAlpha(1));
      draggingEntity.polyline?.material.setValue(draggingEntity.polyline.material.getValue().withAlpha(1));
      draggingEntity.point?.color.setValue(draggingEntity.point.color.getValue().withAlpha(1));
      if (connectionLine) {
        viewer.entities.remove(connectionLine);
      }
      draggingEntity = null;
      originalPositions = [];
    }
  }, Cesium.ScreenSpaceEventType.LEFT_UP);*/
};

// 开始标绘
const startDrawing = (mode) => {
  drawingMode.value = mode;
  positions.value = [];
  entities.value = [];
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click) => {
    const position = viewer.scene.pickPosition(click.position);
    if (position) {
      positions.value.push(position);
      if (drawingMode.value === 'test') {
        const pointEntity = viewer.entities.add({
        position: positions.value[0],
        ellipse: {
          semiMinorAxis: 10000,
          semiMajorAxis: 10000,
          material: Cesium.Color.GREEN.withAlpha(0.5)
        }
      });
        entities.value.push(pointEntity);
        drawingMode.value = null;
        handler.destroy();
      }else if (drawingMode.value === 'point') {
        const pointEntity = viewer.entities.add({
          position: position,
          point: {
            pixelSize: 10,
            color: Cesium.Color.RED
          }
        });
        entities.value.push(pointEntity);
        drawingMode.value = null;
        handler.destroy();
      } else if (drawingMode.value === 'line' && positions.value.length >= 2) {
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: positions.value,
            width: 2,
            material: Cesium.Color.YELLOW
          }
        });
        entities.value.push(lineEntity);
        drawingMode.value = null;
        handler.destroy();
      } else if (drawingMode.value === 'polygon' && positions.value.length >= 3) {
        const polygonEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions.value),
            material: Cesium.Color.BLUE.withAlpha(0.5)
          }
        });
        entities.value.push(polygonEntity);
        drawingMode.value = null;
        handler.destroy();
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction(() => {
    if (drawingMode.value === 'circle' && positions.value.length === 1) {
      const circleEntity = viewer.entities.add({
        position: positions.value[0],
        ellipse: {
          semiMinorAxis: 1000,
          semiMajorAxis: 1000,
          material: Cesium.Color.GREEN.withAlpha(0.5)
        }
      });
      entities.value.push(circleEntity);
      drawingMode.value = null;
      handler.destroy();
    } else if (drawingMode.value === 'rectangle' && positions.value.length === 2) {
      const rectangleEntity = viewer.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.fromCartesianArray(positions.value),
          material: Cesium.Color.ORANGE.withAlpha(0.5)
        }
      });
      entities.value.push(rectangleEntity);
      drawingMode.value = null;
      handler.destroy();
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
};

//是否拖动
function dragClick(isDraggable){
  if(isDraggable){
    state.dragtool?.startDrag();
    console.log(state.dragtool);
  }else{
    state.dragtool?.cancelDrag();
    console.log(state.dragtool);
  }
}
</script>

<style scoped>
#cesiumViewer {
  height: 600px;
  width: 1000px;
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
}

.coordinate-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  border-radius: 3px;
  z-index: 100;
}
</style>