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


export {JavaScriptUpdater, RustUpdater};
