export async function POST(request) {
  try {
    const { cv, jobDescription } = await request.json();

    if (!cv || !jobDescription) {
      return Response.json(
        { error: "Both CV and job description are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Server is missing GEMINI_API_KEY. Add it in your hosting provider's environment variables." },
        { status: 500 }
      );
    }

    const prompt = `You are an expert career coach and resume writer. Given a candidate's existing CV and a target job description, produce a JSON object with exactly these keys:

- "ats_cv": a rewritten, ATS-friendly version of the CV tailored to the job description. Use plain text, clear section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION), and quantify achievements where the original CV allows it. Do not invent experience that isn't implied by the original CV.
- "cover_letter": a concise, specific cover letter (under 350 words) connecting the candidate's real background to this specific role. No generic filler.
- "skills_gap": an array of 4-8 short strings, each naming a skill or qualification the job wants that the CV doesn't clearly show, with a one-line suggestion on how to address it.
- "interview_questions": an array of 6-10 likely interview questions for this specific role based on the job description, mixing behavioral and technical/role-specific questions.

Respond with ONLY the JSON object. No markdown code fences, no preamble, no explanation.

CANDIDATE'S CURRENT CV:
${cv}

TARGET JOB DESCRIPTION:
${jobDescription}`;

    const model = "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return Response.json(
        { error: "The AI service failed to respond. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawText);
      return Response.json(
        { error: "The AI response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Generate route error:", err);
    return Response.json(
      { error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}
