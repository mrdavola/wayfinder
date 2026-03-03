import { supabase } from './supabase';

// ===================== AUTH =====================
export const auth = {
  signUp: async ({ email, password, fullName }) => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  },
  signIn: async ({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password });
  },
  signOut: async () => supabase.auth.signOut(),
  getSession: async () => supabase.auth.getSession(),
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
};

// ===================== PROFILES =====================
export const profiles = {
  get: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();
    return { data, error };
  },
  update: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*, schools(*)')
      .single();
    return { data, error };
  },
  completeOnboarding: async (userId, { schoolId, fullName }) => {
    return supabase
      .from('profiles')
      .update({ school_id: schoolId, full_name: fullName, onboarding_complete: true })
      .eq('id', userId);
  },
};

// ===================== SCHOOLS =====================
export const schools = {
  create: async ({ name, location, standardsFramework }) => {
    const { data, error } = await supabase
      .from('schools')
      .insert({ name, location, standards_framework: standardsFramework })
      .select()
      .single();
    return { data, error };
  },
  list: async () => {
    return supabase.from('schools').select('*').order('name');
  },
};

// ===================== STUDENTS =====================
export const students = {
  list: async (guideId) => {
    return supabase
      .from('students')
      .select('*, quest_students(quest_id)')
      .eq('guide_id', guideId)
      .order('name');
  },
  create: async (studentData) => {
    const { data, error } = await supabase
      .from('students')
      .insert(studentData)
      .select()
      .single();
    return { data, error };
  },
  update: async (id, updates) => {
    return supabase.from('students').update(updates).eq('id', id).select().single();
  },
  delete: async (id) => {
    return supabase.from('students').delete().eq('id', id);
  },
};

// ===================== QUESTS =====================
export const quests = {
  list: async (guideId, status = null) => {
    let query = supabase
      .from('quests')
      .select(`
        *,
        quest_stages(*),
        quest_students(student_id, students(id, name, interests)),
        career_simulations(*)
      `)
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    return query;
  },

  get: async (id) => {
    return supabase
      .from('quests')
      .select(`
        *,
        quest_stages(*),
        quest_students(student_id, students(*)),
        career_simulations(*),
        reflection_entries(*)
      `)
      .eq('id', id)
      .single();
  },

  create: async (questData, stages, simulation, studentIds) => {
    // Insert quest
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .insert(questData)
      .select()
      .single();
    if (questError) return { error: questError };

    // Insert stages
    if (stages?.length) {
      const stagesWithQuestId = stages.map((s, i) => ({
        ...s,
        quest_id: quest.id,
        stage_number: i + 1,
        status: i === 0 ? 'active' : 'locked',
      }));
      const { error: stagesError } = await supabase.from('quest_stages').insert(stagesWithQuestId);
      if (stagesError) return { error: stagesError };
    }

    // Insert simulation
    if (simulation) {
      const { error: simError } = await supabase
        .from('career_simulations')
        .insert({ ...simulation, quest_id: quest.id });
      if (simError) return { error: simError };
    }

    // Assign students
    if (studentIds?.length) {
      const assignments = studentIds.map((sid) => ({ quest_id: quest.id, student_id: sid }));
      const { error: assignError } = await supabase.from('quest_students').insert(assignments);
      if (assignError) return { error: assignError };
    }

    return { data: quest };
  },

  update: async (id, updates) => {
    return supabase.from('quests').update(updates).eq('id', id).select().single();
  },

  delete: async (id) => {
    return supabase.from('quests').delete().eq('id', id);
  },

  launch: async (id) => {
    return supabase
      .from('quests')
      .update({ status: 'active' })
      .eq('id', id);
  },
};

// ===================== QUEST STAGES =====================
export const questStages = {
  complete: async (stageId, nextStageId) => {
    // Mark current stage complete
    await supabase
      .from('quest_stages')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', stageId);

    // Unlock next stage
    if (nextStageId) {
      await supabase
        .from('quest_stages')
        .update({ status: 'active' })
        .eq('id', nextStageId);
    }
  },

  selectBranch: async (stageId, branchId) => {
    const { data: stage } = await supabase
      .from('quest_stages')
      .select('branch_options')
      .eq('id', stageId)
      .single();

    if (!stage) return;
    const updatedOptions = (stage.branch_options || []).map((opt) => ({
      ...opt,
      selected: opt.id === branchId,
    }));
    return supabase
      .from('quest_stages')
      .update({ branch_options: updatedOptions })
      .eq('id', stageId);
  },
};

// ===================== SIMULATIONS =====================
export const simulations = {
  get: async (questId) => {
    return supabase
      .from('career_simulations')
      .select('*, simulation_messages(*)')
      .eq('quest_id', questId)
      .single();
  },

  start: async (simId) => {
    return supabase
      .from('career_simulations')
      .update({ status: 'in_progress' })
      .eq('id', simId);
  },

  complete: async (simId, debriefSummary) => {
    return supabase
      .from('career_simulations')
      .update({ status: 'completed', debrief_summary: debriefSummary })
      .eq('id', simId);
  },

  addMessage: async (simId, role, content, isDecisionPoint = false) => {
    return supabase.from('simulation_messages').insert({
      simulation_id: simId,
      role,
      content,
      is_decision_point: isDecisionPoint,
    });
  },
};

// ===================== REFLECTIONS =====================
export const reflections = {
  list: async (questId) => {
    return supabase
      .from('reflection_entries')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at');
  },

  add: async (questId, content, entryType = 'student', stageId = null, studentId = null) => {
    return supabase.from('reflection_entries').insert({
      quest_id: questId,
      content,
      entry_type: entryType,
      stage_id: stageId,
      student_id: studentId,
    });
  },
};

// ===================== TEMPLATES =====================
export const templates = {
  listPublic: async ({ pathway, gradeBand, sortBy = 'popular' } = {}) => {
    let query = supabase
      .from('quest_templates')
      .select('*')
      .eq('is_public', true);
    if (pathway && pathway !== 'all') query = query.eq('career_pathway', pathway);
    if (gradeBand && gradeBand !== 'all') query = query.eq('grade_band', gradeBand);

    const orderMap = { popular: 'usage_count', rated: 'rating', newest: 'created_at' };
    query = query.order(orderMap[sortBy] || 'usage_count', { ascending: false });
    return query;
  },

  create: async (templateData) => {
    return supabase.from('quest_templates').insert(templateData).select().single();
  },

  incrementUsage: async (id) => {
    const { data } = await supabase.from('quest_templates').select('usage_count').eq('id', id).single();
    if (data) {
      return supabase.from('quest_templates').update({ usage_count: data.usage_count + 1 }).eq('id', id);
    }
  },
};

// ===================== AI HELPERS =====================
// Gemini is the default provider. Anthropic is an optional fallback.
// In production, proxy through a serverless function rather than calling from browser.

// Read user's saved AI settings from localStorage
function getAiSettings() {
  try {
    return JSON.parse(localStorage.getItem('wayfinder_ai_settings') || '{}');
  } catch {
    return {};
  }
}

function getPreferredProvider() {
  const settings = getAiSettings();
  return settings.provider || 'gemini';
}

// ── Gemini call ─────────────────────────────────────────────────────────────
// messages (optional): array of { role: 'user'|'assistant', content: string }
// If messages is provided, treats the last entry as the new user message and
// the rest as history. Otherwise sends userMessage as a single-turn call.
async function callGemini({ systemPrompt, userMessage, messages }) {
  const settings = getAiSettings();
  const apiKey = settings.geminiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  if (messages && messages.length > 0) {
    // Convert Anthropic-style history to Gemini format.
    // Gemini requires history to start with a 'user' turn — strip any leading model turns.
    const converted = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const firstUserIdx = converted.findIndex(m => m.role === 'user');
    const history = firstUserIdx > 0 ? converted.slice(firstUserIdx) : converted;
    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  } else {
    const result = await model.generateContent(userMessage);
    return result.response.text();
  }
}

// ── Anthropic call (fallback / user choice) ─────────────────────────────────
async function callAnthropic({ systemPrompt, userMessage, messages, maxTokens = 500 }) {
  const settings = getAiSettings();
  const apiKey = settings.anthropicKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const msgs = messages || [{ role: 'user', content: userMessage }];
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: msgs,
  });
  return response.content[0].text;
}

// ── Route to preferred provider ──────────────────────────────────────────────
async function callAI(params) {
  return getPreferredProvider() === 'anthropic'
    ? callAnthropic(params)
    : callGemini(params);
}

export const ai = {
  generateQuest: async ({ interests, ageGrade, standards, pathway, type, count }) => {
    const systemPrompt = `You are Wayfinder's curriculum engine. You design project-based learning quests for students in learner-driven schools.

You MUST respond with ONLY valid JSON matching this exact structure. No other text.

Given:
- Student interests: ${interests}
- Age/grade: ${ageGrade}
- Academic standards: ${standards}
- Career pathway: ${pathway || 'none'}
- Quest type: ${type}
- Student count: ${count}

Generate a quest as JSON:
{
  "quest_title": "compelling student-friendly title",
  "quest_subtitle": "one sentence central question",
  "narrative_hook": "2-3 sentences in second person, connecting interest to career",
  "total_duration": 10,
  "stages": [
    {
      "stage_number": 1,
      "stage_title": "action-oriented title",
      "stage_type": "research",
      "duration": 2,
      "description": "3-4 conversational sentences",
      "academic_skills_embedded": ["standard_id"],
      "skill_integration_note": "how skill appears naturally",
      "deliverable": "what student produces",
      "guiding_questions": ["Question 1?", "Question 2?"],
      "resources_needed": ["resource 1"]
    }
  ],
  "career_simulation": {
    "scenario_title": "simulation name",
    "role": "student's professional role",
    "context": "3-4 sentences setting scene",
    "key_decisions": ["Decision 1", "Decision 2", "Decision 3"],
    "skills_assessed": ["skill 1", "skill 2"],
    "voice_agent_personality": "brief character description"
  },
  "reflection_prompts": ["prompt 1", "prompt 2", "prompt 3"],
  "parent_summary": "2-3 sentence parent-facing summary"
}

Rules:
- Academic skills INVISIBLE to student
- Each stage = real investigation step, not a worksheet
- Career connection feels like discovery
- Language age-appropriate but never condescending
- Include 5-7 stages minimum
- Quest must be multidisciplinary`;

    const text = await callAI({ systemPrompt, userMessage: 'Generate the quest JSON now.' });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  },

  simulationChat: async ({ systemPrompt, messages }) => {
    return callAI({ systemPrompt, messages });
  },

  questHelp: async ({ stageDescription, guidingQuestions, helpRequest }) => {
    return callAI({
      systemPrompt: `You are a Socratic guide in Wayfinder. NEVER give the student the answer. Ask questions that help them find it themselves. You are a curious co-explorer, not a teacher. Keep responses to 2-3 questions maximum.

Stage: ${stageDescription}
Guiding questions the student has: ${guidingQuestions.join(', ')}`,
      userMessage: helpRequest,
    });
  },

  debriefSummary: async ({ transcript, skillsAssessed, scenarioContext }) => {
    return callAI({
      systemPrompt: `You write brief simulation debrief summaries for students aged 8-14. Write 3-4 sentences summarizing what the student accomplished and connecting it to real career work. Be warm, specific, and encouraging.`,
      userMessage: `Scenario: ${scenarioContext}\n\nSkills assessed: ${skillsAssessed.join(', ')}\n\nTranscript:\n${transcript.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nWrite the debrief summary.`,
    });
  },

  // Generic chat: messages = [{role:'user'|'assistant', content}], systemPrompt = string
  chat: async (messages, systemPrompt) => {
    return callAI({ systemPrompt, messages });
  },
};
