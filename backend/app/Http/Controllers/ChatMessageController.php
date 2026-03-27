<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use Illuminate\Http\Request;

class ChatMessageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'message' => 'required|string|max:2000',
        ]);

        $chatMessage = ChatMessage::create($validated);

        return response()->json(['message' => 'Message envoyé avec succès', 'data' => $chatMessage], 201);
    }

    public function index(Request $request)
    {
        $messages = ChatMessage::orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($messages);
    }

    public function markAsRead(ChatMessage $chatMessage)
    {
        $chatMessage->update(['is_read' => true]);
        return response()->json(['message' => 'Marqué comme lu']);
    }
}
