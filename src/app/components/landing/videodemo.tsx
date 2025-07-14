import { PlayCircle } from "lucide-react";
import React from "react";

type Props = {
  setShowDemo: (show: boolean) => void;
};
const VideoDemo = ({ setShowDemo }: Props) => {
  return (
    <div className="mt-10 w-full max-w-4xl relative group">
      <div
        className="w-full aspect-video rounded-lg overflow-hidden border border-gray-700 bg-gray-900/60 backdrop-blur-sm cursor-pointer hover:border-purple-500 transition-colors shadow-2xl transform hover:scale-[1.01] hover:shadow-purple-700/20 duration-300"
        onClick={() => setShowDemo(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDemo(true);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Play demo video"
      >
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="w-20 h-20 rounded-full bg-purple-600/20 backdrop-blur-sm flex items-center justify-center p-1 border border-purple-500/30">
            <PlayCircle
              size={50}
              className="text-purple-500 opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all"
            />
          </div>
          <span className="mt-4 text-gray-300 font-medium">
            Watch the 30-second demo
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/40" />

        {/* Interactive UI Mockup */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4/5 aspect-[16/9] bg-gray-800 rounded-md overflow-hidden border border-gray-700 flex items-center justify-center">
            <div className="w-full h-full">
              {/* Browser chrome */}
              <div className="h-[10%] bg-gray-900 border-b border-gray-700 flex items-center px-4">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-6 w-1/2 bg-gray-800 rounded-md" />
                </div>
              </div>

              {/* App content */}
              <div className="h-[90%] bg-gray-800 p-4 flex">
                {/* Sidebar */}
                <div className="w-1/4 h-full bg-gray-900 rounded-md p-3">
                  <div className="w-full h-8 bg-purple-900/30 rounded-md mb-3" />
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={`skeleton-line-${i}`}
                        className="w-full h-6 bg-gray-800 rounded-md"
                      />
                    ))}
                  </div>
                </div>

                {/* Main content area */}
                <div className="w-3/4 h-full pl-4 flex flex-col space-y-3">
                  <div className="h-10 w-1/2 bg-purple-900/40 rounded-md" />
                  <div className="flex-1 bg-gray-900 rounded-md p-3 flex flex-col">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={`grid-item-${i}`}
                          className={`h-8 rounded-md ${
                            i === 0 ? "bg-blue-900/40" : "bg-gray-800"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "Live" indicator */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-md flex items-center">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
          <span className="text-white text-xs font-medium">LIVE DEMO</span>
        </div>
      </div>
    </div>
  );
};

export default VideoDemo;
