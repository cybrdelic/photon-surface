
import React, { useEffect, useRef, useState } from 'react';
import { SCREEN_SHADER } from '../shaders';
import { SceneType, VisualizationMode, ManifoldParams } from '../types';

// WebGPU type definitions
type GPUDevice = any;
type GPUCanvasContext = any;
type GPURenderPipeline = any;
type GPUBuffer = any;
type GPUBindGroup = any;

const GPUBufferUsage = {
  COPY_DST: 8,
  UNIFORM: 64,
};

interface Props {
  sceneType: SceneType;
  visMode: VisualizationMode;
  manifold: ManifoldParams;
}

const WebGPUCanvas: React.FC<Props> = ({ sceneType, visMode, manifold }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef({ 
      sceneType, 
      visMode, 
      manifold,
      zoom: 0, 
      mouseX: 0.5, 
      mouseY: 0.5 
  });
  
  const timeRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    paramsRef.current.sceneType = sceneType;
    paramsRef.current.visMode = visMode;
    paramsRef.current.manifold = manifold;
  }, [sceneType, visMode, manifold]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => { /* Handled in render */ };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let device: GPUDevice;
    let context: GPUCanvasContext;
    let pipeline: GPURenderPipeline;
    let uniformBuffer: GPUBuffer;
    let bindGroup: GPUBindGroup;
    let animationFrameId: number;

    const initWebGPU = async () => {
      try {
        if (!(navigator as any).gpu) throw new Error("WebGPU not supported on this browser.");
        
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) throw new Error("No appropriate GPUAdapter found.");
        
        device = await adapter.requestDevice();
        context = canvas.getContext('webgpu') as GPUCanvasContext;
        
        const format = (navigator as any).gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'premultiplied' });

        const shaderModule = device.createShaderModule({ code: SCREEN_SHADER });

        pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shaderModule, entryPoint: 'main_vertex' },
          fragment: { module: shaderModule, entryPoint: 'main_fragment', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        });

        // 80 bytes needed for struct, allocating 128 for alignment padding
        uniformBuffer = device.createBuffer({
          size: 128, 
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });

        const render = (timestamp: number) => {
          if (!device || !context) return;
          
          const t = timestamp * 0.001;
          timeRef.current = t;
          frameRef.current++;

          const dpr = window.devicePixelRatio || 1;
          const currentWidth = Math.floor(canvas.clientWidth * dpr);
          const currentHeight = Math.floor(canvas.clientHeight * dpr);
          
          if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
             canvas.width = currentWidth;
             canvas.height = currentHeight;
             context.configure({ device, format, alphaMode: 'premultiplied' });
          }

          const { mouseX, mouseY, zoom, sceneType, visMode, manifold } = paramsRef.current;

          // Align to 4 bytes (f32/u32)
          const uniformData = new ArrayBuffer(128);
          const dataView = new DataView(uniformData);
          
          dataView.setFloat32(0, t, true);
          dataView.setFloat32(8, currentWidth, true);
          dataView.setFloat32(12, currentHeight, true);
          dataView.setFloat32(16, mouseX, true);
          dataView.setFloat32(20, mouseY, true);
          dataView.setFloat32(24, zoom, true);
          dataView.setUint32(28, sceneType, true);
          dataView.setUint32(32, visMode, true);
          
          // Manifold Params
          dataView.setFloat32(36, manifold.turbulenceStrength, true);
          dataView.setFloat32(40, manifold.transitionOffset, true);
          dataView.setFloat32(44, manifold.waxDensity, true);
          dataView.setFloat32(48, manifold.roughness, true);
          
          device.queue.writeBuffer(uniformBuffer, 0, uniformData);

          const commandEncoder = device.createCommandEncoder();
          const textureView = context.getCurrentTexture().createView();
          
          const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
              view: textureView,
              clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store',
            }],
          });

          passEncoder.setPipeline(pipeline);
          passEncoder.setBindGroup(0, bindGroup);
          passEncoder.draw(6);
          passEncoder.end();

          device.queue.submit([commandEncoder.finish()]);
          animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    };

    initWebGPU();
    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    paramsRef.current.mouseX = e.clientX / window.innerWidth;
    paramsRef.current.mouseY = e.clientY / window.innerHeight;
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    paramsRef.current.zoom += e.deltaY * 0.001;
    paramsRef.current.zoom = Math.max(-1.8, Math.min(paramsRef.current.zoom, 3.0));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-900 text-red-400 p-10 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">WebGPU Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      className="cursor-crosshair active:cursor-grabbing w-full h-full"
    />
  );
};

export default WebGPUCanvas;
