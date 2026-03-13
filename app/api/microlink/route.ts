import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK with your free key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ status: 'error', message: 'URL is required' }, { status: 400 });
  }

  try {
    // 1. Fetch metadata using Microlink
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&palette=true&audio=true&video=true&iframe=true`;
    const response = await fetch(microlinkUrl);
    const microlinkData = await response.json();

    if (microlinkData.status !== 'success') {
        throw new Error('Microlink failed to parse the URL');
    }

    const info = microlinkData.data;
    
    const bestImage = info.image?.url || info.logo?.url || null;
    const title = info.title || 'Curated Link';
    const description = info.description || '';
    
    let aiSummary = "";

    // 2. Generate AI "Sticky Note" Summary using FREE Google Gemini
    if ((description || title) && process.env.GEMINI_API_KEY) {
        try {
            // We use gemini-1.5-flash because it is extremely fast and free
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `You are a creative assistant. Summarize the following content into a very short, punchy 3-5 word sticky note idea or actionable tip. Do not use quotation marks.\n\nTitle: ${title}\nDescription: ${description}`;
            
            const result = await model.generateContent(prompt);
            aiSummary = result.response.text().trim();
            
            // Clean up any rogue quotes Gemini might accidentally add
            aiSummary = aiSummary.replace(/^["']|["']$/g, '');
        } catch (aiError) {
            console.error("Gemini AI Summary failed:", aiError);
            aiSummary = "Reel captured. Click to edit."; 
        }
    } else {
        aiSummary = "Great find! Click to add notes.";
    }

    // 3. Return the unified payload to your frontend
    return NextResponse.json({
      status: 'success',
      data: {
        title: title,
        description: description,
        image_url: bestImage,
        ai_summary: aiSummary
      }
    });

  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ status: 'error', message: 'Failed to extract data' }, { status: 500 });
  }
}