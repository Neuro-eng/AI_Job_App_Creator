export async function POST(request) {
  try {
    const { cv, jobDescription } = await request.json();

    if (!cv || !jobDescription) {
      return Response.json(
        { error: "Both CV and job description are required." },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!geminiKey && !groqKey) {
      return Response.json(
        { error: "Server is missing GEMINI_API_KEY (and optionally GROQ_API_KEY as backup). Add at least one in your hosting provider's environment variables." },
        { status: 500 }
      );
    }

    const prompt = `You are an expert career coach and resume writer who has helped candidates land offers at top companies. Given a candidate's existing CV and a target job description, produce a JSON object with exactly these keys:

- "ats_cv": a rewritten, ATS-friendly CV tailored to the job description. Follow these rules strictly:
  - The VERY FIRST line must be the candidate's full name exactly as it appears in their original CV, and nothing else on that line.
  - The SECOND line must be their target job title (matching the role they're applying for).
  - The THIRD line must be their contact details in this exact format: phone | email | location — using "|" as the separator, pulling these directly from the original CV.
  - Leave one blank line, then continue with the SUMMARY section header.
  - Every bullet point should follow an "action + context + result" shape (what you did, in what situation, with what measurable outcome), so the candidate can naturally turn each line into a 20-30 second interview story.
  - Start each bullet with a strong, varied action verb (Led, Automated, Reduced, Architected, Resolved, Streamlined, etc.) — never repeat the same starting verb more than twice across the whole CV.
  - Wherever the original CV implies scale, frequency, or impact (number of endpoints, servers, patch cycles, compliance %, team size, time saved), make it explicit with a number, even an estimated reasonable range. Do not fabricate numbers that contradict the original CV, but do surface any quantifiable detail buried in vague phrasing.
  - Avoid generic, resume-cliche phrasing ("responsible for," "duties included," "hardworking team player"). Write the way a strong candidate would actually describe their own impact.
  - Keep formatting plain text with clear section headers (SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS).
  - The SUMMARY section should read like a confident 3-4 sentence pitch, not a keyword list.
- "cover_letter": a SHORT, sharp cover letter — 180-220 words maximum. Three short paragraphs: (1) a specific, non-generic opening hook connecting the candidate's most relevant strength directly to this role, (2) one concrete example of impact from their real background, (3) a brief, confident close. No filler sentences, no restating the job description back at them.
- "skills_gap": an array of 4-8 short strings, each naming a skill or qualification the job wants that the CV doesn't clearly show, with a one-line suggestion on how to address it.
- "interview_questions": an array of 6-10 likely interview questions for this specific role based on the job description, mixing behavioral and technical/role-specific questions.

Respond with ONLY the JSON object. No markdown code fences, no preamble, no explanation.

CANDIDATE'S CURRENT CV:
${cv}

TARGET JOB DESCRIPTION:
${jobDescription}`;

    const model = "gemini-3.6-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const geminiBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    async function callGeminiWithRetry(maxAttempts = 3) {
      let lastErrText = "";
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return text;
        }

        lastErrText = await res.text();
        console.error(`Gemini API error (attempt ${attempt}/${maxAttempts}):`, lastErrText);

        const retryable = res.status === 503 || res.status === 429;
        if (!retryable || attempt === maxAttempts) {
          throw new Error(lastErrText);
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    async function callGroqFallback() {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Groq fallback error:", errText);
        throw new Error(errText);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }

    let rawText;
    try {
      if (geminiKey) {
        rawText = await callGeminiWithRetry();
      } else {
        rawText = await callGroqFallback();
      }
    } catch (primaryErr) {
      // Primary provider failed after retries — try the backup provider if one is configured
      if (groqKey && geminiKey) {
        try {
          console.error("Falling back to Groq after Gemini failure.");
          rawText = await callGroqFallback();
        } catch (fallbackErr) {
          return Response.json(
            { error: "The AI service is temporarily busy. Please try again in a moment." },
            { status: 502 }
          );
        }
      } else {
        return Response.json(
          { error: "The AI service is temporarily busy. Please try again in a moment." },
          { status: 502 }
        );
      }
    }

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
