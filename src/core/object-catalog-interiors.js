// Theme-specific imported furnishings. Dimensions are measured after scale and turn.
import { ccBy } from './object-credit.js';

export const INTERIOR_OBJECTS = {
  table: {
    label: 'Office table', file: 'table', scale: .0125,
    size: [1.877,.769,.938], surface: .769,
    ...ccBy('Office Table','Konstantin Koretskyi',
      'https://sketchfab.com/3d-models/office-table-2e298de5176540f8bdf5633842604806',
      'https://sketchfab.com/cgnoobmaster'),
  },
  armchair: {
    label: 'Armchair',
    file: 'arm_chair',
    scale: 0.255,
    size: [0.912, 0.871, 1.001],
    ...ccBy('Arm Chair', '3dDan', 'https://sketchfab.com/3d-models/arm-chair-92aeb29d63ce4c6093b5b01ef000b95a', 'https://sketchfab.com/kellettupholstery'),
  },
  mug: {
    label: 'Coffee mug',
    file: 'coffee_mug',
    scale: 0.035,
    size: [0.097, 0.102, 0.111],
    ...ccBy('Coffee Mug (School Project)', 'Ole Gunnar Isager', 'https://sketchfab.com/3d-models/coffee-mug-school-project-5f5ccee1514c440887c072fae8e0d699', 'https://sketchfab.com/FrenchBaguette'),
  },
  hospitalbed: {
    label: 'Hospital bed',
    file: 'hospital_bed',
    scale: 0.65,
    turn: Math.PI / 2,
    size: [1.525, 1.167, 2.257],
    ...ccBy('Hospital Bed', 'Ansh_Singla', 'https://sketchfab.com/3d-models/hospital-bed-0e974ea6eb9a4c069c56f152ae5162a4', 'https://sketchfab.com/www.poisonsting'),
  },
  waitingchairs: {
    label: 'Waiting room seats',
    file: 'hospital_chair_row',
    turn: Math.PI / 2,
    size: [1.839, 0.795, 0.584],
    ...ccBy('Chair Hospital', 'Khafesys', 'https://sketchfab.com/3d-models/chair-hospital-baaa4ec5d6d34ad49004e4d151b43aa2', 'https://sketchfab.com/Khafesys'),
  },
  medicalscreen: {
    label: 'Medical privacy screen',
    file: 'hospital_curtain_emergency',
    scale: 1.2,
    turn: 85 * Math.PI / 180, // screen faces +z
    size: [0.647, 1.981, 0.536],
    ...ccBy('Curtain -Emergency -Injection -Hospital - 14MB', 'Mehdi Shahsavan', 'https://sketchfab.com/3d-models/curtain-emergency-injection-hospital-14mb-521e1c0def86420886c56842d9ae0f90', 'https://sketchfab.com/ahmagh2e'),
  },
  medicalcabinet: {
    label: 'Medical cabinet',
    file: 'hospital_medical_treatment_cabinet',
    scale: 0.023,
    size: [1.387, 1.795, 0.601],
    ...ccBy('Hospital medical Treatment Cabinet', 'Chenchanchong', 'https://sketchfab.com/3d-models/hospital-medical-treatment-cabinet-9a9edfe3879e4889877bf1dff97c6105', 'https://sketchfab.com/Chenchanchong'),
  },
  medicaltrolley: {
    label: 'Medical trolley',
    file: 'hospital_medical_trolley',
    scale: 0.021,
    size: [0.68, 0.926, 0.407],
    ...ccBy('Hospital medical Trolley', 'Chenchanchong', 'https://sketchfab.com/3d-models/hospital-medical-trolley-cf02b01766534fe28a57e5e23e8c3f06', 'https://sketchfab.com/Chenchanchong'),
  },
  desklamp: {
    label: 'Desk lamp',
    file: 'office_desk_lamp',
    scale: 0.01,
    turn: Math.PI / 2,
    size: [0.176, 0.573, 0.336],
    ...ccBy('office lamp', 'maxdragonn', 'https://sketchfab.com/3d-models/office-lamp-d934c6b791c34e0fafc30e9625b4c55c', 'https://sketchfab.com/maxdragon'),
  },
  moderndesk: {
    label: 'Office desk (modern)',
    file: 'office_desk_modern',
    size: [1.601, 0.762, 0.8],
    surface: 0.762,
    ...ccBy('Office Table', 'Agha.Najam', 'https://sketchfab.com/3d-models/office-table-80130830a9814e9298f11920ad0b7275', 'https://sketchfab.com/Agha.Najam'),
  },
  schoolcabinet: {
    label: 'Classroom cabinet',
    file: 'school_cabinet',
    scale: 0.85,
    turn: 42 * Math.PI / 180, // source cabinet was exported at an angle
    size: [0.872, 1.721, 0.63],
    ...ccBy('School Cabinet', 'Richard Menez', 'https://sketchfab.com/3d-models/school-cabinet-ad8de156775541daa242bc17ced69b0a', 'https://sketchfab.com/richardwmenez'),
  },
  whiteboard: {
    label: 'Mobile whiteboard',
    file: 'whiteboard_standing',
    scale: 0.24,
    size: [1.988, 1.938, 1.028],
    ...ccBy('Whiteboard', 'EwanLejkowski', 'https://sketchfab.com/3d-models/whiteboard-1675efa75ddd4609960f7a3b08349e28', 'https://sketchfab.com/EwanLejkowski'),
  },
  wallboard: {
    label: 'Wall whiteboard',
    file: 'whiteboard_wall',
    scale: 0.5,
    turn: Math.PI,
    size: [1.988, 0.96, 0.085],
    mount: 'wall',
    lift: 1.05,
    ...ccBy('Whiteboard', 'Darren McNerney 3D', 'https://sketchfab.com/3d-models/whiteboard-d92927c453a14702bb5b5ba3fb6a044a', 'https://sketchfab.com/DarrenMcnerney3D'),
  },
};
