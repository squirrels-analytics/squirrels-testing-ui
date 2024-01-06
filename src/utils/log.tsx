const DEBUG_MODE = false;

export default function log(...data: any[]) {
    if (DEBUG_MODE) {
        console.log(...data)
    }
}