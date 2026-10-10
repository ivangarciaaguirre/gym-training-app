-- Original text catalog; no scraped assets.
begin;
insert into public.exercises (id, name, equipment, muscle_groups, movement_pattern, instructions) values
('bench', 'Barbell bench press', 'Barbell and bench', ARRAY['Chest', 'Triceps'], 'Horizontal push', 'Set your feet and upper back firmly. Lower the bar with control and press smoothly. Use safeties or a spotter.'),
('row', 'Seated cable row', 'Cable', ARRAY['Back', 'Biceps'], 'Horizontal pull', 'Sit tall with a stable torso. Pull toward your ribs, then return with control.'),
('press', 'Dumbbell shoulder press', 'Dumbbells', ARRAY['Shoulders', 'Triceps'], 'Vertical push', 'Keep your torso stable. Press through a comfortable range without forcing your shoulders.'),
('pulldown', 'Lat pulldown', 'Cable', ARRAY['Back', 'Biceps'], 'Vertical pull', 'Pull the handle toward your upper chest with control. Avoid swinging or pulling behind your neck.'),
('squat', 'Goblet squat', 'Dumbbell', ARRAY['Quads', 'Glutes'], 'Squat', 'Hold a dumbbell at your chest. Sit between your hips to a comfortable depth; stand with control.'),
('rdl', 'Romanian deadlift', 'Barbell', ARRAY['Hamstrings', 'Glutes'], 'Hinge', 'Keep a soft knee bend and move your hips back. Keep the bar close; stop at a comfortable hamstring stretch.'),
('legpress', 'Leg press', 'Machine', ARRAY['Quads', 'Glutes'], 'Squat', 'Adjust the seat for a comfortable range. Lower with control and press without forcefully locking your knees.'),
('curl', 'Leg curl', 'Machine', ARRAY['Hamstrings'], 'Knee flexion', 'Align the machine with your knees. Curl smoothly and return with control.'),
('incline', 'Incline dumbbell press', 'Dumbbells and bench', ARRAY['Chest', 'Triceps'], 'Horizontal push', 'Use a modest bench incline. Lower the dumbbells through a comfortable range and press smoothly.'),
('calf', 'Standing calf raise', 'Machine', ARRAY['Calves'], 'Plantar flexion', 'Rise onto your toes with control, pause, and lower slowly through a comfortable range.'),
('lateral', 'Dumbbell lateral raise', 'Dumbbells', ARRAY['Shoulders'], 'Shoulder abduction', 'Use a light load. Raise your arms to a comfortable height without swinging.'),
('split', 'Split squat', 'Dumbbells', ARRAY['Quads', 'Glutes'], 'Lunge', 'Use a stable split stance. Lower with control, keep your front foot planted, then stand. Reps are per side.');
commit;
