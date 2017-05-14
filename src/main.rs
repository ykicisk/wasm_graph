const COULOMB: f32 = 600.0;
const BOUNCE: f32 = 0.1;
const ATTENUATION: f32 = 0.8;


#[no_mangle]
pub extern "C" fn wasm_update_loop(num_nodes_i32: i32,
                                   edge_list_ptr: *const i32,
                                   x_list_ptr: *mut f32,
                                   y_list_ptr: *mut f32,
                                   vx_list_ptr: *mut f32,
                                   vy_list_ptr: *mut f32)
                                   -> f32 {
    let mut energy: f32 = 0.0;

    unsafe {
        let num_nodes = num_nodes_i32 as usize;
        let mut x_list: &mut [f32] = std::slice::from_raw_parts_mut(x_list_ptr, num_nodes);
        let mut y_list: &mut [f32] = std::slice::from_raw_parts_mut(y_list_ptr, num_nodes);
        let mut vx_list: &mut [f32] = std::slice::from_raw_parts_mut(vx_list_ptr, num_nodes);
        let mut vy_list: &mut [f32] = std::slice::from_raw_parts_mut(vy_list_ptr, num_nodes);
        let edge_list: &[i32] = std::slice::from_raw_parts(edge_list_ptr, num_nodes - 1);
        let mut fx_list = vec![0.0; num_nodes];
        let mut fy_list = vec![0.0; num_nodes];
        let mut tmp_x_list = vec![0.0; num_nodes];
        let mut tmp_y_list = vec![0.0; num_nodes];
        tmp_x_list.clone_from_slice(x_list);
        tmp_y_list.clone_from_slice(y_list);
        for idx1 in 0..num_nodes - 1 {
            for idx2 in idx1 + 1..num_nodes {
                let dist_x = x_list[idx1] - tmp_x_list[idx2];
                let dist_y = y_list[idx1] - tmp_y_list[idx2];
                let rsq = dist_x * dist_x + dist_y * dist_y;
                fx_list[idx1] += COULOMB * dist_x / rsq;
                fy_list[idx1] += COULOMB * dist_y / rsq;
                fx_list[idx2] -= COULOMB * dist_x / rsq;
                fy_list[idx2] -= COULOMB * dist_y / rsq;
            }
        }
        for i in 0..num_nodes - 1 {
            let idx1 = edge_list[i] as usize;
            let idx2 = i + 1;

            let dist_x = tmp_x_list[idx2] - tmp_x_list[idx1];
            let dist_y = tmp_y_list[idx2] - tmp_y_list[idx1];

            fx_list[idx1] += BOUNCE * dist_x;
            fy_list[idx1] += BOUNCE * dist_y;
            fx_list[idx2] -= BOUNCE * dist_x;
            fy_list[idx2] -= BOUNCE * dist_y;
        }
        for idx in 0..num_nodes {
            vx_list[idx] = (vx_list[idx] + fx_list[idx]) * ATTENUATION;
            vy_list[idx] = (vy_list[idx] + fy_list[idx]) * ATTENUATION;
            x_list[idx] += vx_list[idx];
            y_list[idx] += vy_list[idx];
            energy += vx_list[idx].powf(2.0) * vy_list[idx].powf(2.0);
        }
    }
    energy
}


#[no_mangle]
pub extern "C" fn wasm_update_at_once(epsilon: f32,
                                      num_nodes_i32: i32,
                                      edge_list_ptr: *const i32,
                                      x_list_ptr: *mut f32,
                                      y_list_ptr: *mut f32,
                                      vx_list_ptr: *mut f32,
                                      vy_list_ptr: *mut f32)
                                      -> f32 {
    let mut energy: f32;
    loop {
        energy = wasm_update_loop(num_nodes_i32,
                                  edge_list_ptr,
                                  x_list_ptr,
                                  y_list_ptr,
                                  vx_list_ptr,
                                  vy_list_ptr);
        if energy < epsilon {
            break;
        }
    }
    energy
}


fn main() {}
