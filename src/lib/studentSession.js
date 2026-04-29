// Persistent student session stored in localStorage
// Structure: { studentId: string, studentName: string, studentPin?: string }
// studentPin is set after successful PIN-based login and is required by
// submit_stage_work to prove the caller is who they claim to be. The picker
// flow on /q/:id sets only id+name; submissions from that path are rejected
// server-side with "PIN required" until the student logs in properly.

const KEY = 'wayfinder_student_session';

export function getStudentSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStudentSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearStudentSession() {
  localStorage.removeItem(KEY);
}
