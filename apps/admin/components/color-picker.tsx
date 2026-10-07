import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover";
import { HexColorPicker } from "react-colorful";

type ColorPickerProps = {
  label: string;
  color: string;
  onChange: (color: string) => void;
  clearColor: string;
  resetColor: string;
};

export const ColorPicker = ({
  label,
  color,
  onChange,
  clearColor,
  resetColor,
}: ColorPickerProps) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-xs text-neutral-500 dark:text-neutral-400">{label}</label>}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded="false"
              style={{ backgroundColor: color }}
              className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            />
          </PopoverTrigger>
          <PopoverContent
            align="center"
            className="z-50 outline-none w-[210px] p-2 rounded-lg border border-neutral-200 dark:border-neutral-800/60 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl"
          >
            <div className="relative isolate">
              <div className="w-full h-[160px]">
                <HexColorPicker
                  color={color}
                  onChange={onChange}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  className="bg-neutral-100 dark:bg-neutral-800/20 border border-neutral-300 dark:border-neutral-800/60 rounded px-2 py-1 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-0 w-full"
                  type="text"
                  value={color}
                  onChange={(e) => onChange(e.target.value)}
                />
                <div className="flex justify-between gap-2">
                  <button
                    className="text-[10px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    onClick={() => onChange(clearColor)}
                  >
                    Clear
                  </button>
                  <button
                    className="text-[10px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    onClick={() => onChange(resetColor)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-[100px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50 px-3 font-mono text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/15"
          placeholder={color}
        />
      </div>
    </div>
  );
};
