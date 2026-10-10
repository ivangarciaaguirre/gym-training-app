export const catalog = [
  { id: 'bench', name: 'Barbell bench press', equipment: 'Barbell and bench', muscles: ['Chest', 'Triceps'], pattern: 'Horizontal push', instructions: 'Set your feet and upper back firmly. Lower the bar with control and press smoothly. Use safeties or a spotter.' },
  { id: 'row', name: 'Seated cable row', equipment: 'Cable', muscles: ['Back', 'Biceps'], pattern: 'Horizontal pull', instructions: 'Sit tall with a stable torso. Pull toward your ribs, then return with control.' },
  { id: 'press', name: 'Dumbbell shoulder press', equipment: 'Dumbbells', muscles: ['Shoulders', 'Triceps'], pattern: 'Vertical push', instructions: 'Keep your torso stable. Press through a comfortable range without forcing your shoulders.' },
  { id: 'pulldown', name: 'Lat pulldown', equipment: 'Cable', muscles: ['Back', 'Biceps'], pattern: 'Vertical pull', instructions: 'Pull the handle toward your upper chest with control. Avoid swinging or pulling behind your neck.' },
  { id: 'squat', name: 'Goblet squat', equipment: 'Dumbbell', muscles: ['Quads', 'Glutes'], pattern: 'Squat', instructions: 'Hold a dumbbell at your chest. Sit between your hips to a comfortable depth; stand with control.' },
  { id: 'rdl', name: 'Romanian deadlift', equipment: 'Barbell', muscles: ['Hamstrings', 'Glutes'], pattern: 'Hinge', instructions: 'Keep a soft knee bend and move your hips back. Keep the bar close; stop at a comfortable hamstring stretch.' },
  { id: 'legpress', name: 'Leg press', equipment: 'Machine', muscles: ['Quads', 'Glutes'], pattern: 'Squat', instructions: 'Adjust the seat for a comfortable range. Lower with control and press without forcefully locking your knees.' },
  { id: 'curl', name: 'Leg curl', equipment: 'Machine', muscles: ['Hamstrings'], pattern: 'Knee flexion', instructions: 'Align the machine with your knees. Curl smoothly and return with control.' },
  { id: 'incline', name: 'Incline dumbbell press', equipment: 'Dumbbells and bench', muscles: ['Chest', 'Triceps'], pattern: 'Horizontal push', instructions: 'Use a modest bench incline. Lower the dumbbells through a comfortable range and press smoothly.' },
  { id: 'calf', name: 'Standing calf raise', equipment: 'Machine', muscles: ['Calves'], pattern: 'Plantar flexion', instructions: 'Rise onto your toes with control, pause, and lower slowly through a comfortable range.' },
  { id: 'lateral', name: 'Dumbbell lateral raise', equipment: 'Dumbbells', muscles: ['Shoulders'], pattern: 'Shoulder abduction', instructions: 'Use a light load. Raise your arms to a comfortable height without swinging.' },
  { id: 'split', name: 'Split squat', equipment: 'Dumbbells', muscles: ['Quads', 'Glutes'], pattern: 'Lunge', instructions: 'Use a stable split stance. Lower with control, keep your front foot planted, then stand. Reps are per side.' },
] as const;
export type ExerciseId = typeof catalog[number]['id'];
export function exerciseName(id: string) { return catalog.find(e => e.id === id)?.name ?? id; }
