import {Controller} from "./Controller";
import {API_BASE_URL} from "../utils/api/api_config";
import {ReturnObject} from "../common/response/ReturnObject";

export interface AIAssistantChatStreamRequest {
    message: string;
    conversationId?: string;
}

export interface AIAssistantStreamHandlers {
    onEvent?: (event: string, data: any) => void;
    signal?: AbortSignal;
}

export class AIAssistantController extends Controller {

    clearMemory = this._post<{conversationId?: string | null}, any>("api/ai_assistant/memory/clear");

    async streamChat(
        request: AIAssistantChatStreamRequest,
        handlers?: AIAssistantStreamHandlers
    ): Promise<void> {
        const onEvent = handlers?.onEvent;
        const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
        const url = `${base}api/ai_assistant/chat/stream`;

        const response = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            body: JSON.stringify(request),
            signal: handlers?.signal
        });

        if (!response.ok || !response.body) {
            const fallback: ReturnObject = {
                code: response.status,
                status: ReturnObject.Status.ERROR,
                message: `stream request failed with status ${response.status}`,
                timestamp: Date.now()
            };
            onEvent?.("error", fallback);
            throw new Error(fallback.message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, {stream: true});
            const frames = extractFrames(buffer);
            buffer = frames.rest;
            for (const frame of frames.events) {
                const parsed = parseSseEvent(frame);
                if (!parsed) {
                    continue;
                }
                onEvent?.(parsed.event, parsed.data);
            }
        }

        const remaining = buffer.trim();
        if (remaining) {
            const parsed = parseSseEvent(remaining);
            if (parsed) {
                onEvent?.(parsed.event, parsed.data);
            }
        }
    }
}

const extractFrames = (buffer: string): { events: string[]; rest: string } => {
    const events: string[] = [];
    let rest = buffer;
    while (true) {
        const idx = rest.indexOf("\n\n");
        if (idx < 0) {
            break;
        }
        const frame = rest.slice(0, idx).trim();
        rest = rest.slice(idx + 2);
        if (frame) {
            events.push(frame);
        }
    }
    return {events, rest};
};

const parseSseEvent = (rawFrame: string): { event: string; data: any } | null => {
    if (!rawFrame) {
        return null;
    }
    let eventName = "message";
    const dataLines: string[] = [];
    const lines = rawFrame.split(/\r?\n/);
    for (const line of lines) {
        if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim();
            continue;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim());
        }
    }
    const dataText = dataLines.join("\n");
    if (!dataText) {
        return {event: eventName, data: null};
    }
    try {
        return {event: eventName, data: JSON.parse(dataText)};
    } catch (_e) {
        return {event: eventName, data: dataText};
    }
};

