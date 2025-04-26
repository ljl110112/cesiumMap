<template>
  <div id="cesiumViewer"></div>
  <div v-if="selectedFeature" class="info-box">
    <h3>路网信息</h3>
    <pre>{{ selectedFeature.properties }}</pre>
    <button @click="selectedFeature = null">关闭</button>
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
// import '../public/CesiumVectorTile.js';
import { onMounted, ref } from 'vue';
let viewer = null;
const selectedFeature = ref(null);
onMounted(async () => {
  initCesium();
})

//初始化
const initCesium = async () => {
  viewer = new Cesium.Viewer('cesiumViewer', {
    // infoBox: false, // 禁用沙箱，解决控制台报错
    // animation: false, // 是否创建动画小器件，左下角仪表
    // baseLayerPicker: false, // 是否显示图层选择器
    // fullscreenButton: false, // 是否显示全屏按钮
    // geocoder: false, // 是否显示geocoder小器件，右上角查询按钮
    // homeButton: false, // 是否显示Home按钮
    // infoBox: false, // 是否显示信息框
    // sceneModePicker: false, // 是否显示3D/2D选择器
    // selectionIndicator: false, // 是否显示选取指示器组件
    // timeline: false, // 是否显示时间轴
    // navigationHelpButton: false, // 是否显示右上角的帮助按钮
    // navigationInstructionsInitiallyVisible: false,  //是否显示帮助信息控件
    // // showRenderLoopErrors: false, // 是否显示渲染错误
    // // // 设置背景透明
    // // orderIndependentTranslucency: 
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

  // try {
  //   // 加载本地GeoJSON文件
  //   const geoJsonUrl = './data/roads.geojson'; // 确保文件放在public/data目录下

  //   const geoJsonDataSource = new Cesium.GeoJsonDataSource();
  //   const dataSource = await geoJsonDataSource.load(geoJsonUrl, {
  //     stroke: Cesium.Color.RED,
  //     strokeWidth: 2,
  //     simplify:true,
  //   });

  //   // 将数据源添加到Viewer
  //   viewer.dataSources.add(dataSource);

  //   // 添加点击事件处理
  //   const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  //   handler.setInputAction(async (click) => {
  //     const feature = viewer.scene.pick(click.position);
  //     if (feature instanceof Cesium.Cesium3DTileFeature) {
  //       feature = feature.content; // 处理3D Tiles特性
  //     }

  //     if (feature?.id?.properties) {
  //       // 将Cesium.Property转换为普通对象
  //       const properties = await feature.id.properties.name._value;
  //       selectedFeature.value = { properties };
  //     } else {
  //       selectedFeature.value = null;
  //     }
  //   }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  // } catch (error) {
  //   console.error('加载GeoJSON失败:', error);
  // }

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
}

</script>

<style scoped>
#cesiumViewer {
  height: 600px;
  width: 1000px;
}
</style>