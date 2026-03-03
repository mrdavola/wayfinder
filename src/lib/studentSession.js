// Persistent student session stored in localStorage
// Structure: { studentId: string, studentName: string }

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
