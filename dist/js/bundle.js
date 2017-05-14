/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return JavaScriptUpdater; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return RustUpdater; });
class GraphUpdaterBase {
    constructor({epsilon, animation_flag, num_nodes, x_list, y_list, edge_list}) {
        this.COULOMB = 600.0;
        this.BOUNCE = 0.1;
        this.ATTENUATION = 0.8;

        this.epsilon = epsilon;
        this.animation_flag = animation_flag;
        this.before_time = new Date().getTime();
        this.num_nodes = num_nodes;
        this.x_list = x_list;
        this.y_list = y_list;
        this.edge_list = edge_list;
        // vx, vy
        this.vx_list_ptr = Module._malloc(num_nodes*4);
        this.vy_list_ptr = Module._malloc(num_nodes*4);
        this.vx_list = new Float32Array(Module.HEAPF32.buffer, this.vx_list_ptr, this.num_nodes);
        this.vy_list = new Float32Array(Module.HEAPF32.buffer, this.vy_list_ptr, this.num_nodes);
        this.vx_list.fill(0.0);
        this.vy_list.fill(0.0);
    }
    destructor() {
        Module._free(this.vx_list_ptr); 
        Module._free(this.vy_list_ptr); 
    }
    start({finish_callback, draw_callback}) {
        this.setup({finish_callback, draw_callback});

        if(this.animation_flag) {
            this.update_loop();
        }else{
            this.update_at_once();
        }
    }
    setup({finish_callback, draw_callback}) {
        this.finish_callback = finish_callback;
        this.draw_callback = draw_callback;
        this.start_time = new Date().getTime();
    }
    teardown() {
        let end_time = new Date().getTime();
        this.finish_callback(end_time - this.start_time);
        this.draw_callback();
    }
    update_loop() {
        let energy = this._update_loop();
        console.log(`energy: ${energy}`);
        this.draw_callback();
        if(energy > this.epsilon){
            setTimeout(() => {this.update_loop();}, 0);
        }else{
            this.teardown();
        }
    }
    update_at_once() {
        let energy = this._update_at_once();
        console.log(`energy: ${energy}`);
        this.teardown();
    }
    _update_loop() {
        return 0.0;
    }
    _update_at_once(){
        return 0.0;
    }
}


class JavaScriptUpdater extends GraphUpdaterBase {
    constructor({epsilon, animation_flag, num_nodes, x_list, y_list, edge_list}) {
        super({epsilon, animation_flag, num_nodes, x_list, y_list, edge_list});
        this.tmp_x_list = new Float32Array(this.num_nodes);
        this.tmp_y_list = new Float32Array(this.num_nodes);
        this.fx_list = new Float32Array(this.num_nodes);
        this.fy_list = new Float32Array(this.num_nodes);
        this.vx_list = new Float32Array(this.num_nodes);
        this.vy_list = new Float32Array(this.num_nodes);
    }
    _update_loop() {
        // init
        this.tmp_x_list.set(this.x_list);
        this.tmp_y_list.set(this.y_list);
        this.fx_list.fill(0.0);
        this.fy_list.fill(0.0);

        let energy = 0.0;
        for (let idx1 = 0; idx1 < this.num_nodes-1; idx1++){
            for (let idx2 = idx1 + 1; idx2 < this.num_nodes; idx2++){
                let dist_x = this.tmp_x_list[idx1] - this.tmp_x_list[idx2];
                let dist_y = this.tmp_y_list[idx1] - this.tmp_y_list[idx2];
                let rsq = Math.pow(dist_x, 2) + Math.pow(dist_y, 2);
                this.fx_list[idx1] += this.COULOMB * dist_x / rsq;
                this.fy_list[idx1] += this.COULOMB * dist_y / rsq;
                this.fx_list[idx2] -= this.COULOMB * dist_x / rsq;
                this.fy_list[idx2] -= this.COULOMB * dist_y / rsq;
            }
        }
        for (var i = 0; i < (this.num_nodes - 1);i++) {
            let idx1 = this.edge_list[i];
            let idx2 = i+1;

            let dist_x = this.tmp_x_list[idx2] - this.tmp_x_list[idx1];
            let dist_y = this.tmp_y_list[idx2] - this.tmp_y_list[idx1];

            this.fx_list[idx1] += this.BOUNCE * dist_x;
            this.fy_list[idx1] += this.BOUNCE * dist_y;
            this.fx_list[idx2] -= this.BOUNCE * dist_x;
            this.fy_list[idx2] -= this.BOUNCE * dist_y;
        }
        for (let idx = 0; idx < this.num_nodes; idx++){
            this.vx_list[idx] = (this.vx_list[idx] + this.fx_list[idx]) * this.ATTENUATION;
            this.vy_list[idx] = (this.vy_list[idx] + this.fy_list[idx]) * this.ATTENUATION;
            this.x_list[idx] += this.vx_list[idx];
            this.y_list[idx] += this.vy_list[idx];
            energy += Math.pow(this.vx_list[idx], 2) * Math.pow(this.vy_list[idx], 2);
        }
        return energy;
    }
    _update_at_once() {
        let energy = 0.0;
        for(;;){
            energy = this._update_loop();
            if(energy < this.epsilon){
                break
            }
        }
        return energy;
    }
}

class RustUpdater extends GraphUpdaterBase {
    constructor({epsilon, animation_flag, num_nodes, x_list, y_list, edge_list}) {
        super({epsilon, animation_flag, num_nodes, x_list, y_list, edge_list});
        console.log("RustUpdater.constructor");

        this.wasm_update_loop = Module.cwrap('wasm_update_loop',
                                             'number',
                                             ['number', 'number',
                                              'number', 'number',
                                              'number', 'number']);
        this.wasm_update_at_once = Module.cwrap('wasm_update_at_once',
                                                'number',
                                                ['number', 'number', 'number',
                                                 'number', 'number',
                                                 'number', 'number']);
    }
    _update_loop() {
        return this.wasm_update_loop(this.num_nodes, this.edge_list.byteOffset,
                                     this.x_list.byteOffset, this.y_list.byteOffset,
                                     this.vx_list.byteOffset, this.vy_list.byteOffset);
    }
    _update_at_once() {
        return this.wasm_update_at_once(this.epsilon, this.num_nodes, this.edge_list.byteOffset,
                                        this.x_list.byteOffset, this.y_list.byteOffset,
                                        this.vx_list.byteOffset, this.vy_list.byteOffset);
    }
}





/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__GraphUpdater__ = __webpack_require__(0);

const CANVAS_SIZE = 720;

let num_nodes = 6;
let num_edges = 4;

let x_list_ptr = null;
let y_list_ptr = null;
let edge_list_ptr = null;

let x_list = null;
let y_list = null;
let edge_list = null;

let x_pool = null;
let y_pool = null;

function init_graph() {
    let _num_nodes = Number($("#num_nodes").val());
    if(!Number.isInteger(_num_nodes)){
        window.alert("num_nodes must be Integer!");
        return;
    }
    if(_num_nodes <= 1) {
        window.alert("num_nodes must be > 1");
        return;
    }
    num_nodes = _num_nodes;
    num_edges = _num_nodes - 1;

    if(x_list_ptr) {
        Module._free(x_list_ptr); 
        Module._free(y_list_ptr); 
        Module._free(edge_list_ptr); 
    }

    x_list_ptr = Module._malloc(num_nodes*4);
    y_list_ptr = Module._malloc(num_nodes*4);
    edge_list_ptr = Module._malloc(num_edges*4);

    x_list = new Float32Array(Module.HEAPF32.buffer, x_list_ptr, num_nodes);
    y_list = new Float32Array(Module.HEAPF32.buffer, y_list_ptr, num_nodes);
    edge_list = new Int32Array(Module.HEAP32.buffer, edge_list_ptr, num_edges);
    // init node position
    for (let i = 0; i < num_nodes; i++){
        x_list[i] = Math.random() * CANVAS_SIZE;
        y_list[i] = Math.random() * CANVAS_SIZE;
    }
    // init edge
    for (let i = 1; i < num_nodes; i++){
        let pair_idx = Math.floor(Math.random() * i);
        edge_list[i-1] = pair_idx;
    }
    // save node position into pool
    x_pool = new Float32Array(num_nodes);
    y_pool = new Float32Array(num_nodes);
    x_pool.set(x_list);
    y_pool.set(y_list);

    draw_graph();
}

function reset_graph() {
    // reset node position
    x_list.set(x_pool);
    y_list.set(y_pool);

    draw_graph();
}

function draw_graph(){
    const DRAW_SIZE = 3 * CANVAS_SIZE / 4;
    const CENTER = CANVAS_SIZE / 2;
    let min_x = Math.min(...x_list);
    let max_x = Math.max(...x_list);
    let min_y = Math.min(...y_list);
    let max_y = Math.max(...y_list);
    let center_x = (min_x + max_x) / 2;
    let center_y = (min_y + max_y) / 2;
    $("canvas").clearCanvas();
    for (let i = 0; i < num_nodes; i++) {
        let x = CENTER + DRAW_SIZE*(x_list[i] - center_x) / (max_x - min_x);
        let y = CENTER + DRAW_SIZE*(y_list[i] - center_y) / (max_y - min_y);
        $("canvas").drawArc({
            strokeStyle: "black",
            x, y, radius: 5
        });
    }
    for (let i = 0; i < num_edges; i++) {
        let idx1 = edge_list[i];
        let idx2 = i+1;
        let x1 = CENTER + DRAW_SIZE*(x_list[idx1] - center_x) / (max_x - min_x);
        let y1 = CENTER + DRAW_SIZE*(y_list[idx1] - center_y) / (max_y - min_y);
        let x2 = CENTER + DRAW_SIZE*(x_list[idx2] - center_x) / (max_x - min_x);
        let y2 = CENTER + DRAW_SIZE*(y_list[idx2] - center_y) / (max_y - min_y);
        $("canvas").drawLine({
            strokeStyle: "black",
            strokeWidth: 1,
            x1, y1, x2, y2
        });
    }
}

function start_update(_class){
    for (let e of ["#init_graph", "#reset_graph", "#update_by_js", "#update_by_rs"]) {
        $(e).prop('disabled', true);
    }
    let cls = new _class({
        epsilon: 0.5, 
        animation_flag: $('#anime_check').prop('checked'), 
        num_nodes, x_list, y_list, edge_list
    });
    cls.start({
        draw_callback: draw_graph,
        finish_callback: (t) => {
            for (let e of ["#init_graph", "#reset_graph", "#update_by_js", "#update_by_rs"]) {
                $(e).prop('disabled', false);
            }
            $("#time").text(t/1000);
            cls.destructor();
        },
    });
}

$(function(){
    let menu_html = `
        num_nodes: <input id='num_nodes' type='number' min="2" value='6'><br>
        <button id='init_graph'>Init Graph</button><br>
        <button id='reset_graph'>Reset Graph</button><br>
        <button id='update_by_js'>Update by JavaScript</button>
        <button id='update_by_rs'>Update by WASM</button><br>
        <input id='anime_check' type='checkbox' value='1' checked="true"> animation flag<br>
        time: <span id='time'>-</span> s<br>
        `;
    $("#menu").html(menu_html);
    // bind functions
    $("#init_graph").click(init_graph);
    $("#reset_graph").click(reset_graph);
    $("#update_by_js").click(() => {start_update(__WEBPACK_IMPORTED_MODULE_0__GraphUpdater__["a" /* JavaScriptUpdater */]);});
    $("#update_by_rs").click(() => {start_update(__WEBPACK_IMPORTED_MODULE_0__GraphUpdater__["b" /* RustUpdater */]);});
});



/***/ })
/******/ ]);