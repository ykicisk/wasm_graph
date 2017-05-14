import { JavaScriptUpdater, RustUpdater } from './GraphUpdater';
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
    $("#update_by_js").click(() => {start_update(JavaScriptUpdater);});
    $("#update_by_rs").click(() => {start_update(RustUpdater);});
});

