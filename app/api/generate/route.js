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

    const prompt = `You are an expert career coach and resume writer who has helped candidates land offers at top companies. Given a candidate's existing CV and a target job description, produce a JSON object with exactly these keys:

- "ats_cv": a rewritten, ATS-friendly CV tailored to the job description. Follow these rules strictly:
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
