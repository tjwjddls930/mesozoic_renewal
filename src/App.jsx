import React, { useEffect } from 'react';
import '../main.css';
import { Mesozoic } from '../main.js';

const App = () => {
  useEffect(() => {
    const app = new Mesozoic();
    return () => {
      app.dispose();
    };
  }, []);

  return (
    <>
      <div
        id="container"
        className="fixed w-[100vw] h-[100vh]"
      >
        <div id="health-bar"></div>
        <div
          id="time-display"
          className="absolute text-[rgba(229,231,235)] right-[4%] top-[2%] sm:top-[4%] text-3xl font-semibold"
        >
          00:00:00
        </div>
      </div>

      <div
        id="loading"
        className="fixed flex items-center justify-center z-50 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.9)]"
      >
        <div
          id="progress-bar-container"
          className="flex flex-col h-[30%] w-[100vw] items-center justify-center"
        >
          <label
            id="label"
            htmlFor="progress-bar"
            className="text-white text-3xl text-center"
          >
            Loading
          </label>

          <progress
            id="progress-bar"
            value="0"
            max="100"
            className="items-center w-[60%] sm:w-[30%] mt-[7%] sm:mt-[3%] h-[50px]"
          />
        </div>
      </div>

      <div
        id="instruction-image-container"
        className="hidden fixed bg-[url(./mesozoic-instruction-1.png)] bg-[rgba(0,0,0,0.9)] bg-contain bg-center bg-no-repeat w-[100vw] h-[100vh] items-center justify-center opacity-90 z-50"
      >
        <button
          id="startBtn"
          className="hidden relative top-[15%] sm:top-[20%] lg:top-[30%] w-24 h-10 touch-manipulation select-none text-base font-semibold leading-5 py-2 px-4 text-center bg-green-700 hover:bg-green-600 text-white border-none rounded-md cursor-pointer z-50"
        >
          START
        </button>
      </div>
    </>
  );
};

export default App;
