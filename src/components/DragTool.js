/*
 * @Author: ljl110112 644583707@qq.com
 * @Date: 2025-04-27 09:40:27
 * @LastEditors: ljl110112 644583707@qq.com
 * @LastEditTime: 2025-04-27 17:24:23
 * @FilePath: \cesium\src\components\DragTool.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as Cesium from "cesium";
export default class DragTool {
  constructor({ viewer }) {
    this.viewer = viewer;
    this.leftDownFlag = false;
    this.pick = null; //储存实体
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    console.log(this.handler);
  }
  // 开始拖拽
  startDrag() {
    this.leftClickAction();
    this.mouseMoveAction();
  }
  /*
    leftUpAction() {
        this.handler.setInputAction(e => {
            if (this.leftDownFlag === true && this.pick != null) {
                this.leftDownFlag = false;
                this.pointDraged = null;
                this.viewer.scene.screenSpaceCameraController.enableRotate = true;//解锁相机
            }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
    }
    leftDownAction() {
        this.handler.setInputAction(e => {
            let pick = this.viewer.scene.pick(e.position);
            if (Cesium.defined(pick) && (pick.id.id)) {
                this.pick = pick
                this.leftDownFlag = true;
                this.viewer.scene.screenSpaceCameraController.enableRotate = false;//锁定相机
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    }*/

  mouseMoveAction() {
    this.handler.setInputAction((e) => {
      if (this.leftDownFlag === true && this.pick != null) {
        let ray = this.viewer.camera.getPickRay(e.endPosition);
        let cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);

        // this.pick.id.position = cartesian;
        this.pick.id.position = new Cesium.CallbackProperty(function () {
          return cartesian;
        }, false); 

      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  leftClickAction() {
    this.handler.setInputAction((e) => {
      let pick = this.viewer.scene.pick(e.position);
      let ray = this.viewer.camera.getPickRay(e.position);
      let cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (this.leftDownFlag) {
        this.leftDownFlag = false;
        // 移除 CallbackProperty，设置为固定位置
        if (cartesian) {
            if(this.pick.id){
                this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                setTimeout(() => {
                    console.log('ting');
                  }, 200); // 停顿 2 秒
                this.pick.id.position = cartesian;
                this.pick.id.position = cartesian;
                setTimeout(() => {
                    console.log('ting');
                  }, 200); // 停顿 2 秒
                this.pick.id.position = cartesian;
                this.pick.id.position = cartesian;
                this.pick.id = null;
                this.pick.id = null;
                setTimeout(() => {
                    console.log('ting');
                  }, 200); // 停顿 2 秒
                this.pick.id = null;
                this.pick.id = null;
                this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            }            
        }
      }
      if (Cesium.defined(pick) && pick.id.id) {
        this.pick = pick;
        this.leftDownFlag = true;
        this.viewer.scene.screenSpaceCameraController.enableRotate = false; //锁定相机
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
  //清除鼠标事件
  cancelDrag() {
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
}
