import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  X,
  Users,
  User,
  BookOpen,
  FlaskConical,
  Presentation,
  NotebookPen,
  Microscope,
  Atom,
  Activity,
  Heart,
  Trophy,
  Plus,
  RefreshCw,
  ArrowLeft,
  Loader2,
  // Career pathway icons
  Brain,
  Waves,
  Code2,
  Shield,
  Gamepad2,
  Bot,
  BarChart2,
  Cpu,
  Rocket,
  Building2,
  Zap,
  TrendingUp,
  Lightbulb,
  Megaphone,
  Paintbrush,
  Film,
  Music,
  Newspaper,
  Palette,
  Sprout,
  Sun,
  TreePine,
  ChefHat,
  Star,
  GraduationCap,
  Scale,
  FlaskConical as Flask2,
  Dna,
  Stethoscope,
  Dumbbell,
  Globe,
  Wind,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/api';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const T = {
  ink: '#1A1A2E',
  paper: '#FAF8F5',
  parchment: '#F0EDE6',
  graphite: '#6B7280',
  pencil: '#9CA3AF',
  specimenRed: '#C0392B',
  fieldGreen: '#2D6A4F',
  compassGold: '#B8860B',
  labBlue: '#1B4965',
  chalk: '#FFFFFF',
};

// ── Inline Standards Data ──────────────────────────────────────────────────────
const STANDARDS_FRAMEWORKS = [
  // ── MATH K-2 ──
  {
    id: 'math_k2', label: 'Common Core Math K–2', subject: 'math', gradeBand: 'K-2',
    categories: [
      { id: 'cc', label: 'Counting & Cardinality', standards: [
        { id: 'CCSS.MATH.K.CC.A.1', label: 'K.CC.A.1', description: 'Count to 100 by ones and tens' },
        { id: 'CCSS.MATH.K.CC.B.4', label: 'K.CC.B.4', description: 'Understand the relationship between numbers and quantities' },
        { id: 'CCSS.MATH.1.NBT.B.2', label: '1.NBT.B.2', description: 'Understand two-digit numbers as bundles of tens and ones' },
        { id: 'CCSS.MATH.2.NBT.B.5', label: '2.NBT.B.5', description: 'Fluently add and subtract within 100' },
      ]},
      { id: 'oa', label: 'Operations & Algebraic Thinking', standards: [
        { id: 'CCSS.MATH.K.OA.A.2', label: 'K.OA.A.2', description: 'Solve addition and subtraction word problems within 10' },
        { id: 'CCSS.MATH.1.OA.A.1', label: '1.OA.A.1', description: 'Use addition and subtraction within 20 to solve word problems' },
        { id: 'CCSS.MATH.2.OA.A.1', label: '2.OA.A.1', description: 'Use addition and subtraction within 100 to solve word problems' },
      ]},
      { id: 'md', label: 'Measurement & Data', standards: [
        { id: 'CCSS.MATH.1.MD.C.4', label: '1.MD.C.4', description: 'Organize, represent, and interpret data with up to three categories' },
        { id: 'CCSS.MATH.2.MD.D.10', label: '2.MD.D.10', description: 'Draw a picture graph and bar graph to represent data' },
      ]},
      { id: 'g', label: 'Geometry', standards: [
        { id: 'CCSS.MATH.K.G.A.1', label: 'K.G.A.1', description: 'Describe objects in the environment using names of shapes' },
        { id: 'CCSS.MATH.2.G.A.1', label: '2.G.A.1', description: 'Recognize and draw shapes having specified attributes' },
      ]},
    ],
  },
  // ── MATH 3-5 ──
  {
    id: 'math_35', label: 'Common Core Math 3–5', subject: 'math', gradeBand: '3-5',
    categories: [
      { id: 'oa', label: 'Operations & Algebraic Thinking', standards: [
        { id: 'CCSS.MATH.3.OA.A.3', label: '3.OA.A.3', description: 'Use multiplication and division within 100 to solve word problems' },
        { id: 'CCSS.MATH.4.OA.A.3', label: '4.OA.A.3', description: 'Solve multi-step word problems using the four operations' },
        { id: 'CCSS.MATH.5.OA.B.3', label: '5.OA.B.3', description: 'Analyze patterns and relationships on a coordinate plane' },
      ]},
      { id: 'nf', label: 'Number & Operations — Fractions', standards: [
        { id: 'CCSS.MATH.3.NF.A.1', label: '3.NF.A.1', description: 'Understand a fraction as a part of a whole' },
        { id: 'CCSS.MATH.4.NF.B.3', label: '4.NF.B.3', description: 'Add and subtract fractions with like denominators' },
        { id: 'CCSS.MATH.5.NF.B.5', label: '5.NF.B.5', description: 'Interpret multiplication as scaling (resizing) fractions' },
      ]},
      { id: 'md', label: 'Measurement & Data', standards: [
        { id: 'CCSS.MATH.3.MD.C.5', label: '3.MD.C.5', description: 'Recognize area as an attribute of plane figures' },
        { id: 'CCSS.MATH.4.MD.A.2', label: '4.MD.A.2', description: 'Solve problems involving measurement units and conversions' },
        { id: 'CCSS.MATH.5.MD.B.2', label: '5.MD.B.2', description: 'Represent and interpret data using line plots' },
      ]},
      { id: 'g', label: 'Geometry', standards: [
        { id: 'CCSS.MATH.5.G.A.1', label: '5.G.A.1', description: 'Graph coordinates in the first quadrant of a coordinate plane' },
        { id: 'CCSS.MATH.3.G.A.1', label: '3.G.A.1', description: 'Understand that shapes in different categories share attributes' },
      ]},
    ],
  },
  // ── MATH 6-8 ──
  {
    id: 'math_68', label: 'Common Core Math 6–8', subject: 'math', gradeBand: '6-8',
    categories: [
      { id: 'rp', label: 'Ratios & Proportional Relationships', standards: [
        { id: 'CCSS.MATH.6.RP.A.1', label: '6.RP.A.1', description: 'Understand ratio concepts and describe ratio relationships' },
        { id: 'CCSS.MATH.7.RP.A.2', label: '7.RP.A.2', description: 'Recognize and represent proportional relationships between quantities' },
      ]},
      { id: 'ee', label: 'Expressions & Equations', standards: [
        { id: 'CCSS.MATH.6.EE.A.2', label: '6.EE.A.2', description: 'Write, read, and evaluate expressions with variables' },
        { id: 'CCSS.MATH.7.EE.B.4', label: '7.EE.B.4', description: 'Use variables to represent quantities and solve real-world problems' },
        { id: 'CCSS.MATH.8.EE.C.7', label: '8.EE.C.7', description: 'Solve linear equations in one variable' },
      ]},
      { id: 'f', label: 'Functions', standards: [
        { id: 'CCSS.MATH.8.F.A.1', label: '8.F.A.1', description: 'Understand that a function assigns exactly one output to each input' },
        { id: 'CCSS.MATH.8.F.B.4', label: '8.F.B.4', description: 'Construct a function to model a linear relationship between two quantities' },
      ]},
      { id: 'sp', label: 'Statistics & Probability', standards: [
        { id: 'CCSS.MATH.6.SP.B.4', label: '6.SP.B.4', description: 'Display numerical data in plots on a number line' },
        { id: 'CCSS.MATH.8.SP.A.1', label: '8.SP.A.1', description: 'Construct and interpret scatter plots for bivariate measurement data' },
      ]},
      { id: 'g', label: 'Geometry', standards: [
        { id: 'CCSS.MATH.7.G.B.4', label: '7.G.B.4', description: 'Understand the formulas for area and circumference of circles' },
        { id: 'CCSS.MATH.8.G.B.7', label: '8.G.B.7', description: 'Apply the Pythagorean Theorem to determine unknown side lengths' },
      ]},
    ],
  },
  // ── ELA K-2 ──
  {
    id: 'ela_k2', label: 'ELA / Literacy K–2', subject: 'ela', gradeBand: 'K-2',
    categories: [
      { id: 'rl', label: 'Reading Literature', standards: [
        { id: 'CCSS.ELA.K.RL.A.1', label: 'K.RL.A.1', description: 'With prompting, ask and answer questions about key details in a text' },
        { id: 'CCSS.ELA.1.RL.A.3', label: '1.RL.A.3', description: 'Describe characters, settings, and major events in a story' },
        { id: 'CCSS.ELA.2.RL.A.5', label: '2.RL.A.5', description: 'Describe the overall structure of a story (beginning, middle, end)' },
      ]},
      { id: 'ri', label: 'Reading Informational Text', standards: [
        { id: 'CCSS.ELA.2.RI.A.1', label: '2.RI.A.1', description: 'Ask and answer questions about key details in an informational text' },
        { id: 'CCSS.ELA.1.RI.A.7', label: '1.RI.A.7', description: 'Use illustrations and details to describe key ideas in a text' },
      ]},
      { id: 'w', label: 'Writing', standards: [
        { id: 'CCSS.ELA.1.W.A.1', label: '1.W.A.1', description: 'Write opinion pieces about a topic and supply a reason for the opinion' },
        { id: 'CCSS.ELA.2.W.A.2', label: '2.W.A.2', description: 'Write informative texts to supply facts about a topic' },
      ]},
      { id: 'sl', label: 'Speaking & Listening', standards: [
        { id: 'CCSS.ELA.K.SL.A.1', label: 'K.SL.A.1', description: 'Participate in collaborative conversations with diverse partners' },
        { id: 'CCSS.ELA.2.SL.A.3', label: '2.SL.A.3', description: 'Ask and answer questions about what a speaker says' },
      ]},
    ],
  },
  // ── ELA 3-5 ──
  {
    id: 'ela_35', label: 'ELA / Literacy 3–5', subject: 'ela', gradeBand: '3-5',
    categories: [
      { id: 'w', label: 'Writing', standards: [
        { id: 'CCSS.ELA-LITERACY.W.4.1', label: 'W.4.1', description: 'Write opinion pieces supporting a point of view with reasons and information' },
        { id: 'CCSS.ELA-LITERACY.W.4.2', label: 'W.4.2', description: 'Write informative/explanatory texts to examine a topic clearly' },
        { id: 'CCSS.ELA-LITERACY.W.5.2', label: 'W.5.2', description: 'Write informative texts using facts, definitions, and details' },
        { id: 'CCSS.ELA-LITERACY.W.5.7', label: 'W.5.7', description: 'Conduct short research projects using several sources' },
      ]},
      { id: 'ri', label: 'Reading Informational Text', standards: [
        { id: 'CCSS.ELA-LITERACY.RI.4.7', label: 'RI.4.7', description: 'Interpret information presented visually, orally, or quantitatively' },
        { id: 'CCSS.ELA-LITERACY.RI.5.9', label: 'RI.5.9', description: 'Integrate information from several texts on the same topic' },
        { id: 'CCSS.ELA-LITERACY.RI.5.6', label: 'RI.5.6', description: 'Analyze multiple accounts of the same event or topic' },
      ]},
      { id: 'rl', label: 'Reading Literature', standards: [
        { id: 'CCSS.ELA-LITERACY.RL.4.1', label: 'RL.4.1', description: 'Refer to story details when explaining what the text says explicitly' },
        { id: 'CCSS.ELA-LITERACY.RL.5.3', label: 'RL.5.3', description: 'Compare and contrast two or more characters, settings, or events in a story' },
      ]},
      { id: 'sl', label: 'Speaking & Listening', standards: [
        { id: 'CCSS.ELA-LITERACY.SL.4.4', label: 'SL.4.4', description: 'Report on a topic using appropriate facts and relevant, descriptive details' },
        { id: 'CCSS.ELA-LITERACY.SL.5.5', label: 'SL.5.5', description: 'Include multimedia components and visual displays in presentations' },
      ]},
    ],
  },
  // ── ELA 6-8 ──
  {
    id: 'ela_68', label: 'ELA / Literacy 6–8', subject: 'ela', gradeBand: '6-8',
    categories: [
      { id: 'w', label: 'Writing', standards: [
        { id: 'CCSS.ELA-LITERACY.W.6.1', label: 'W.6.1', description: 'Write arguments to support claims with clear reasons and relevant evidence' },
        { id: 'CCSS.ELA-LITERACY.W.7.2', label: 'W.7.2', description: 'Write explanatory texts to examine complex ideas and information' },
        { id: 'CCSS.ELA-LITERACY.W.8.7', label: 'W.8.7', description: 'Conduct short research projects to answer a question, drawing on several sources' },
      ]},
      { id: 'ri', label: 'Reading Informational Text', standards: [
        { id: 'CCSS.ELA-LITERACY.RI.6.8', label: 'RI.6.8', description: 'Trace and evaluate the argument and specific claims in a text' },
        { id: 'CCSS.ELA-LITERACY.RI.7.5', label: 'RI.7.5', description: 'Analyze the structure an author uses to organize a text' },
        { id: 'CCSS.ELA-LITERACY.RI.8.9', label: 'RI.8.9', description: 'Analyze a case in which texts provide conflicting information on the same topic' },
      ]},
      { id: 'sl', label: 'Speaking & Listening', standards: [
        { id: 'CCSS.ELA-LITERACY.SL.6.4', label: 'SL.6.4', description: 'Present claims and findings, emphasizing salient points' },
        { id: 'CCSS.ELA-LITERACY.SL.7.5', label: 'SL.7.5', description: 'Include multimedia components and visual displays in presentations to clarify claims' },
      ]},
      { id: 'l', label: 'Language', standards: [
        { id: 'CCSS.ELA-LITERACY.L.6.4', label: 'L.6.4', description: 'Determine or clarify the meaning of unknown and multiple-meaning words' },
        { id: 'CCSS.ELA-LITERACY.L.8.3', label: 'L.8.3', description: 'Use knowledge of language and its conventions to achieve particular effects' },
      ]},
    ],
  },
  // ── NGSS K-5 ──
  {
    id: 'ngss_k5', label: 'NGSS K–5', subject: 'science', gradeBand: 'K-5',
    categories: [
      { id: 'ps', label: 'Physical Sciences', standards: [
        { id: 'NGSS.K-PS2-1', label: 'K-PS2-1', description: 'Plan and investigate to compare effects of different strengths of pushes and pulls' },
        { id: 'NGSS.4-PS3-2', label: '4-PS3-2', description: 'Make observations to provide evidence that energy can be transferred from place to place' },
        { id: 'NGSS.5-PS1-1', label: '5-PS1-1', description: 'Develop a model that matter is made of particles too small to be seen' },
      ]},
      { id: 'ls', label: 'Life Sciences', standards: [
        { id: 'NGSS.K-LS1-1', label: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive' },
        { id: 'NGSS.3-LS4-3', label: '3-LS4-3', description: 'Construct an argument with evidence that some animals help their habitat' },
        { id: 'NGSS.4-LS1-1', label: '4-LS1-1', description: 'Construct an argument that organisms have internal and external structures for survival' },
      ]},
      { id: 'ess', label: 'Earth & Space Sciences', standards: [
        { id: 'NGSS.2-ESS2-1', label: '2-ESS2-1', description: 'Compare multiple solutions to slow wind or water from changing the shape of the land' },
        { id: 'NGSS.5-ESS3-1', label: '5-ESS3-1', description: 'Obtain and combine information about how communities protect Earth\'s resources' },
      ]},
    ],
  },
  // ── NGSS 6-8 ──
  {
    id: 'ngss_68', label: 'NGSS 6–8', subject: 'science', gradeBand: '6-8',
    categories: [
      { id: 'ps', label: 'Physical Sciences', standards: [
        { id: 'NGSS.MS-PS1-1', label: 'MS-PS1-1', description: 'Develop models to describe the atomic composition of simple molecules and extended structures' },
        { id: 'NGSS.MS-PS1-2', label: 'MS-PS1-2', description: 'Analyze and interpret data on properties of substances before and after reactions' },
        { id: 'NGSS.MS-PS3-1', label: 'MS-PS3-1', description: 'Construct and interpret graphical displays to describe relationships of kinetic energy' },
      ]},
      { id: 'ls', label: 'Life Sciences', standards: [
        { id: 'NGSS.MS-LS1-1', label: 'MS-LS1-1', description: 'Conduct an investigation to provide evidence that living things are made of cells' },
        { id: 'NGSS.MS-LS1-6', label: 'MS-LS1-6', description: 'Construct a scientific explanation based on evidence for the role of photosynthesis' },
        { id: 'NGSS.MS-LS2-1', label: 'MS-LS2-1', description: 'Analyze and interpret data to provide evidence for effects of resource availability on organisms' },
      ]},
      { id: 'ess', label: 'Earth & Space Sciences', standards: [
        { id: 'NGSS.MS-ESS2-1', label: 'MS-ESS2-1', description: 'Develop a model to describe the cycling of Earth\'s materials and the flow of energy' },
      ]},
      { id: 'ets', label: 'Engineering Design', standards: [
        { id: 'NGSS.MS-ETS1-1', label: 'MS-ETS1-1', description: 'Define the criteria and constraints of a design problem with sufficient precision' },
        { id: 'NGSS.MS-ETS1-2', label: 'MS-ETS1-2', description: 'Evaluate competing design solutions using a systematic process to determine how well they meet criteria' },
      ]},
    ],
  },
  // ── NGSS 9-12 ──
  {
    id: 'ngss_912', label: 'NGSS 9–12', subject: 'science', gradeBand: '9-12',
    categories: [
      { id: 'ps', label: 'Physical Sciences', standards: [
        { id: 'NGSS.HS-PS1-2', label: 'HS-PS1-2', description: 'Construct and revise an explanation for the outcome of a simple chemical reaction' },
        { id: 'NGSS.HS-PS3-1', label: 'HS-PS3-1', description: 'Create a computational model to calculate the change in energy of one component in a system' },
      ]},
      { id: 'ls', label: 'Life Sciences', standards: [
        { id: 'NGSS.HS-LS1-1', label: 'HS-LS1-1', description: 'Construct an explanation for how the structure of DNA determines the structure of proteins' },
        { id: 'NGSS.HS-LS4-2', label: 'HS-LS4-2', description: 'Construct an explanation based on evidence that the process of evolution primarily results from four factors' },
      ]},
      { id: 'ess', label: 'Earth & Space Sciences', standards: [
        { id: 'NGSS.HS-ESS1-4', label: 'HS-ESS1-4', description: 'Use mathematical representations to predict the motion of orbiting objects' },
        { id: 'NGSS.HS-ESS3-4', label: 'HS-ESS3-4', description: 'Evaluate or refine a technological solution that reduces impacts of human activities on natural systems' },
      ]},
      { id: 'ets', label: 'Engineering Design', standards: [
        { id: 'NGSS.HS-ETS1-2', label: 'HS-ETS1-2', description: 'Design a solution to a complex real-world problem by breaking it into smaller, more manageable problems' },
        { id: 'NGSS.HS-ETS1-3', label: 'HS-ETS1-3', description: 'Evaluate a solution to a complex real-world problem based on prioritized criteria and trade-offs' },
      ]},
    ],
  },
  // ── Math Practices ──
  {
    id: 'math_practices', label: 'Standards for Mathematical Practice', subject: 'practices', gradeBand: 'All',
    categories: [
      { id: 'mp', label: 'Mathematical Practice Standards', standards: [
        { id: 'CCSS.MATH.PRACTICE.MP1', label: 'MP1', description: 'Make sense of problems and persevere in solving them' },
        { id: 'CCSS.MATH.PRACTICE.MP2', label: 'MP2', description: 'Reason abstractly and quantitatively' },
        { id: 'CCSS.MATH.PRACTICE.MP3', label: 'MP3', description: 'Construct viable arguments and critique the reasoning of others' },
        { id: 'CCSS.MATH.PRACTICE.MP4', label: 'MP4', description: 'Model with mathematics' },
        { id: 'CCSS.MATH.PRACTICE.MP5', label: 'MP5', description: 'Use appropriate tools strategically' },
        { id: 'CCSS.MATH.PRACTICE.MP6', label: 'MP6', description: 'Attend to precision' },
        { id: 'CCSS.MATH.PRACTICE.MP7', label: 'MP7', description: 'Look for and make use of structure' },
        { id: 'CCSS.MATH.PRACTICE.MP8', label: 'MP8', description: 'Look for and express regularity in repeated reasoning' },
      ]},
    ],
  },
  // ── C3 Social Studies ──
  {
    id: 'c3_ss', label: 'C3 Social Studies Framework', subject: 'ss', gradeBand: 'All',
    categories: [
      { id: 'civ', label: 'Civics', standards: [
        { id: 'C3.D2.Civ.1', label: 'D2.Civ.1', description: 'Distinguish the powers and responsibilities of local, state, and national civic institutions' },
        { id: 'C3.D2.Civ.5', label: 'D2.Civ.5', description: 'Explain the origins, functions, and structure of government with focus on protecting rights and freedoms' },
        { id: 'C3.D2.Civ.10', label: 'D2.Civ.10', description: 'Explain how people can work together to influence or change laws and public policy' },
      ]},
      { id: 'eco', label: 'Economics', standards: [
        { id: 'C3.D2.Eco.1', label: 'D2.Eco.1', description: 'Explain how economic decisions affect the well-being of individuals, businesses, and society' },
        { id: 'C3.D2.Eco.4', label: 'D2.Eco.4', description: 'Describe the role of buyers and sellers in product, capital, and labor markets' },
        { id: 'C3.D2.Eco.13', label: 'D2.Eco.13', description: 'Explain why advancements in technology and investments in capital goods increase economic growth' },
      ]},
      { id: 'his', label: 'History', standards: [
        { id: 'C3.D2.His.1', label: 'D2.His.1', description: 'Analyze connections among events and developments in broader historical contexts' },
        { id: 'C3.D2.His.5', label: 'D2.His.5', description: 'Explain how and why perspectives of people have changed over time' },
        { id: 'C3.D2.His.14', label: 'D2.His.14', description: 'Explain multiple causes and effects of events and developments in the past' },
      ]},
      { id: 'geo', label: 'Geography', standards: [
        { id: 'C3.D2.Geo.1', label: 'D2.Geo.1', description: 'Construct maps to represent and explain the spatial patterns of cultural and environmental characteristics' },
        { id: 'C3.D2.Geo.6', label: 'D2.Geo.6', description: 'Explain how the movement of goods, capital, people, and ideas affects cultural and natural environments' },
        { id: 'C3.D2.Geo.12', label: 'D2.Geo.12', description: 'Explain patterns of human settlement and the causes and effects of migration' },
      ]},
    ],
  },
];

// Career pathway categories with many options
const PATHWAY_CATEGORIES = [
  { id: 'all',      label: 'All' },
  { id: 'science',  label: 'Science' },
  { id: 'tech',     label: 'Technology' },
  { id: 'health',   label: 'Health' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'business', label: 'Business' },
  { id: 'arts',     label: 'Arts & Media' },
  { id: 'earth',    label: 'Earth & Environment' },
  { id: 'society',  label: 'Society & Law' },
];

const CAREER_PATHWAYS = [
  // ── Science ──
  { id: 'material_science', label: 'Material Science', tags: 'BATTERIES · NANO-MATERIALS · SMART COMPOSITES', color: '#1B4965', Icon: Atom, category: 'science' },
  { id: 'biology', label: 'Biology & Life Sciences', tags: 'GENOMICS · DRUG DISCOVERY · ECOLOGY', color: '#2D6A4F', Icon: Activity, category: 'science' },
  { id: 'chemistry', label: 'Chemistry', tags: 'REACTIONS · POLYMERS · PHARMACEUTICAL SYNTHESIS', color: '#6B3FA0', Icon: FlaskConical, category: 'science' },
  { id: 'physics', label: 'Physics & Astrophysics', tags: 'MECHANICS · OPTICS · QUANTUM', color: '#1B4965', Icon: Star, category: 'science' },
  { id: 'neuroscience', label: 'Neuroscience', tags: 'BRAIN MAPPING · COGNITION · NEUROPROSTHETICS', color: '#7C3AED', Icon: Brain, category: 'science' },
  { id: 'genetics', label: 'Genetics & Genomics', tags: 'DNA SEQUENCING · CRISPR · HEREDITY', color: '#059669', Icon: Dna, category: 'science' },
  { id: 'marine_biology', label: 'Marine & Ocean Science', tags: 'CORAL REEFS · DEEP SEA · OCEAN TECH', color: '#0369A1', Icon: Waves, category: 'science' },
  { id: 'environmental_science', label: 'Environmental Science', tags: 'CLIMATE · ECOSYSTEMS · CONSERVATION', color: '#15803D', Icon: Wind, category: 'science' },
  { id: 'space_science', label: 'Space Science & Astronomy', tags: 'EXOPLANETS · SATELLITES · DEEP SPACE', color: '#312E81', Icon: Rocket, category: 'science' },

  // ── Technology ──
  { id: 'software_engineering', label: 'Software Engineering', tags: 'APPS · WEB · SYSTEM DESIGN', color: '#1B4965', Icon: Code2, category: 'tech' },
  { id: 'ai_ml', label: 'AI & Machine Learning', tags: 'NEURAL NETS · NLP · COMPUTER VISION', color: '#7C3AED', Icon: Bot, category: 'tech' },
  { id: 'cybersecurity', label: 'Cybersecurity', tags: 'ENCRYPTION · THREAT ANALYSIS · ETHICAL HACKING', color: '#B45309', Icon: Shield, category: 'tech' },
  { id: 'game_design', label: 'Game Design & Development', tags: 'MECHANICS · WORLD-BUILDING · NARRATIVE', color: '#C0392B', Icon: Gamepad2, category: 'tech' },
  { id: 'robotics', label: 'Robotics & Automation', tags: 'SENSORS · ACTUATORS · CONTROL SYSTEMS', color: '#0369A1', Icon: Cpu, category: 'tech' },
  { id: 'data_science', label: 'Data Science & Analytics', tags: 'STATISTICS · VISUALIZATION · PREDICTION', color: '#0D9488', Icon: BarChart2, category: 'tech' },
  { id: 'ux_design', label: 'UX/UI Design & Product', tags: 'USER RESEARCH · PROTOTYPING · ACCESSIBILITY', color: '#7C3AED', Icon: Palette, category: 'tech' },
  { id: 'hardware', label: 'Hardware & Electronics', tags: 'CIRCUITS · EMBEDDED SYSTEMS · PCB DESIGN', color: '#1B4965', Icon: Zap, category: 'tech' },

  // ── Health ──
  { id: 'healthcare', label: 'Digital Health & Telemedicine', tags: 'DIAGNOSTIC AI · PATIENT CARE · REMOTE MEDICINE', color: '#C0392B', Icon: Heart, category: 'health' },
  { id: 'biomedical_engineering', label: 'Biomedical Engineering', tags: 'PROSTHETICS · IMAGING · IMPLANTS', color: '#7C3AED', Icon: Stethoscope, category: 'health' },
  { id: 'sports_medicine', label: 'Sports Medicine & Performance', tags: 'INJURY PREVENTION · BIOMECHANICS · NUTRITION', color: '#B45309', Icon: Dumbbell, category: 'health' },
  { id: 'mental_health', label: 'Mental Health & Psychology', tags: 'THERAPY · COGNITION · BEHAVIORAL SCIENCE', color: '#0D9488', Icon: Brain, category: 'health' },
  { id: 'veterinary', label: 'Veterinary & Animal Science', tags: 'ANIMAL CARE · WILDLIFE MEDICINE · ZOOLOGY', color: '#15803D', Icon: Heart, category: 'health' },
  { id: 'public_health', label: 'Public Health & Epidemiology', tags: 'DISEASE PREVENTION · GLOBAL HEALTH · POLICY', color: '#C0392B', Icon: Globe, category: 'health' },

  // ── Engineering ──
  { id: 'aerospace', label: 'Aerospace & Aviation', tags: 'FLIGHT DYNAMICS · PROPULSION · SPACECRAFT', color: '#1B4965', Icon: Rocket, category: 'engineering' },
  { id: 'civil_engineering', label: 'Civil & Structural Engineering', tags: 'BRIDGES · BUILDINGS · INFRASTRUCTURE', color: '#B45309', Icon: Building2, category: 'engineering' },
  { id: 'mechanical_engineering', label: 'Mechanical Engineering', tags: 'MACHINES · THERMODYNAMICS · MANUFACTURING', color: '#0369A1', Icon: Cpu, category: 'engineering' },
  { id: 'electrical_engineering', label: 'Electrical Engineering', tags: 'POWER SYSTEMS · SIGNAL PROCESSING · CIRCUITS', color: '#B45309', Icon: Zap, category: 'engineering' },
  { id: 'urban_design', label: 'Urban Planning & Architecture', tags: 'CITIES · SUSTAINABILITY · SPACE DESIGN', color: '#0369A1', Icon: Building2, category: 'engineering' },
  { id: 'chemical_engineering', label: 'Chemical Engineering', tags: 'PROCESS DESIGN · SAFETY · SCALE-UP', color: '#6B3FA0', Icon: FlaskConical, category: 'engineering' },
  { id: 'renewable_energy_tech', label: 'Renewable Energy Engineering', tags: 'SOLAR · WIND · GRID STORAGE', color: '#15803D', Icon: Sun, category: 'engineering' },

  // ── Business ──
  { id: 'entrepreneurship', label: 'Entrepreneurship & Startups', tags: 'PITCH DECKS · PRODUCT-MARKET FIT · FUNDING', color: '#B45309', Icon: Lightbulb, category: 'business' },
  { id: 'finance', label: 'Finance & Investment', tags: 'MARKETS · RISK · PORTFOLIO MANAGEMENT', color: '#1B4965', Icon: TrendingUp, category: 'business' },
  { id: 'marketing', label: 'Marketing & Brand Strategy', tags: 'CONSUMER INSIGHT · CAMPAIGNS · STORYTELLING', color: '#C0392B', Icon: Megaphone, category: 'business' },
  { id: 'economics', label: 'Economics & Public Policy', tags: 'MARKETS · INCENTIVES · GLOBAL TRADE', color: '#0369A1', Icon: Globe, category: 'business' },
  { id: 'supply_chain', label: 'Supply Chain & Logistics', tags: 'OPERATIONS · GLOBAL TRADE · LAST-MILE', color: '#B45309', Icon: TrendingUp, category: 'business' },

  // ── Arts & Media ──
  { id: 'graphic_design', label: 'Graphic Design & Visual Arts', tags: 'TYPOGRAPHY · COMPOSITION · BRAND IDENTITY', color: '#7C3AED', Icon: Paintbrush, category: 'arts' },
  { id: 'filmmaking', label: 'Filmmaking & Video Production', tags: 'CINEMATOGRAPHY · EDITING · DOCUMENTARY', color: '#C0392B', Icon: Film, category: 'arts' },
  { id: 'music_production', label: 'Music Production & Audio', tags: 'MIXING · SOUND DESIGN · ARTIST DEVELOPMENT', color: '#7C3AED', Icon: Music, category: 'arts' },
  { id: 'journalism', label: 'Journalism & Media', tags: 'INVESTIGATION · STORYTELLING · DIGITAL MEDIA', color: '#0369A1', Icon: Newspaper, category: 'arts' },
  { id: 'animation', label: 'Animation & Visual Effects', tags: '3D MODELING · MOTION GRAPHICS · GAME ART', color: '#7C3AED', Icon: Palette, category: 'arts' },
  { id: 'architecture', label: 'Architecture & Interior Design', tags: 'SPACE · MATERIALS · HUMAN EXPERIENCE', color: '#B45309', Icon: Building2, category: 'arts' },
  { id: 'fashion', label: 'Fashion Design & Textiles', tags: 'PATTERNS · SUSTAINABILITY · WEARABLE TECH', color: '#C0392B', Icon: Star, category: 'arts' },

  // ── Earth & Environment ──
  { id: 'agriculture', label: 'Agriculture & Food Technology', tags: 'PRECISION FARMING · SOIL SCIENCE · FOOD SYSTEMS', color: '#15803D', Icon: Sprout, category: 'earth' },
  { id: 'renewable_energy', label: 'Renewable Energy', tags: 'SOLAR · WIND · CLIMATE POLICY', color: '#B45309', Icon: Sun, category: 'earth' },
  { id: 'conservation', label: 'Wildlife Conservation & Ecology', tags: 'BIODIVERSITY · HABITAT · FIELD RESEARCH', color: '#15803D', Icon: TreePine, category: 'earth' },
  { id: 'food_science', label: 'Culinary Arts & Food Science', tags: 'CHEMISTRY OF COOKING · NUTRITION · FOOD BUSINESS', color: '#C0392B', Icon: ChefHat, category: 'earth' },
  { id: 'oceanography', label: 'Oceanography & Climate', tags: 'SEA LEVEL · OCEAN CIRCULATION · MARINE POLICY', color: '#0369A1', Icon: Waves, category: 'earth' },

  // ── Society & Law ──
  { id: 'education', label: 'Education & Learning Design', tags: 'CURRICULUM · EDTECH · LEARNING SCIENCE', color: '#0D9488', Icon: GraduationCap, category: 'society' },
  { id: 'law', label: 'Law & Legal Studies', tags: 'JUSTICE · CONTRACTS · CONSTITUTIONAL LAW', color: '#1B4965', Icon: Scale, category: 'society' },
  { id: 'social_work', label: 'Social Work & Community Dev', tags: 'ADVOCACY · EQUITY · YOUTH PROGRAMS', color: '#0D9488', Icon: Users, category: 'society' },
  { id: 'archaeology', label: 'History & Archaeology', tags: 'ARTIFACTS · EXCAVATION · CULTURAL HERITAGE', color: '#B45309', Icon: Globe, category: 'society' },
  { id: 'political_science', label: 'Political Science & Government', tags: 'POLICY · ELECTIONS · DIPLOMACY', color: '#1B4965', Icon: Globe, category: 'society' },
];

const STEP_LABELS = ['Students', 'Skills', 'Pathway', 'Generating', 'Review', 'Launch'];

const LOADING_TEXTS = [
  'Mapping interests to standards...',
  'Designing challenge sequence...',
  'Connecting to career pathways...',
  'Calibrating difficulty...',
  'Building simulation scenario...',
];

const STAGE_ICONS = {
  research: BookOpen,
  experiment: FlaskConical,
  simulate: Microscope,
  present: Presentation,
  reflect: NotebookPen,
};

const AI_SUGGESTIONS_BY_GRADE = {
  'K-2':  ['CCSS.MATH.K.OA.A.2',        'CCSS.ELA.2.RI.A.1',          'NGSS.K-LS1-1'],
  '3-5':  ['CCSS.MATH.4.NF.B.3',        'CCSS.ELA-LITERACY.W.4.1',    'NGSS.4-PS3-2'],
  '6-8':  ['CCSS.MATH.7.RP.A.2',        'CCSS.ELA-LITERACY.W.6.1',    'NGSS.MS-LS1-1'],
  '9-12': ['CCSS.MATH.8.F.B.4',         'CCSS.ELA-LITERACY.W.8.7',    'NGSS.HS-ETS1-2'],
};

// Find a standard object by id across all frameworks
function findStandardById(id) {
  for (const fw of STANDARDS_FRAMEWORKS) {
    for (const cat of fw.categories) {
      const found = cat.standards.find((s) => s.id === id);
      if (found) return found;
    }
  }
  return null;
}

// Intersection of arrays (for shared interests)
function arrayIntersection(arrays) {
  if (!arrays.length) return [];
  return arrays.reduce((acc, arr) => acc.filter((x) => arr.includes(x)));
}

// ── Compass SVG ────────────────────────────────────────────────────────────────
function CompassSpinner() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 3s linear infinite' }}
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke={T.ink} strokeWidth="5" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="37" stroke={T.ink} strokeWidth="2" />
      {/* Cardinal tick marks */}
      <line x1="50" y1="5"  x2="50" y2="13" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="87" y1="50" x2="95" y2="50" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="87" x2="50" y2="95" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="5"  y1="50" x2="13" y2="50" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      {/* 4-pointed star with hollow center */}
      <path
        d="M 50 18 C 54 36, 64 46, 82 50 C 64 54, 54 64, 50 82 C 46 64, 36 54, 18 50 C 36 46, 46 36, 50 18 Z M 50 44 A 6 6 0 1 0 50 56 A 6 6 0 1 0 50 44 Z"
        fill={T.ink}
        fillRule="evenodd"
      />
    </svg>
  );
}

// ── Animated Checkmark ─────────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill={T.fieldGreen} />
      <polyline
        points="24,40 36,52 56,28"
        fill="none"
        stroke={T.chalk}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: 0,
          animation: 'checkDraw 0.6s ease-out forwards',
        }}
      />
    </svg>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 40 }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDone ? T.fieldGreen : isActive ? T.ink : 'transparent',
                  border: `2px solid ${isDone ? T.fieldGreen : isActive ? T.ink : T.pencil}`,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? (
                  <Check size={14} color={T.chalk} strokeWidth={2.5} />
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isActive ? T.chalk : T.pencil,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {stepNum}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? T.ink : isDone ? T.fieldGreen : T.pencil,
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  height: 2,
                  width: 32,
                  backgroundColor: isDone ? T.fieldGreen : T.parchment,
                  marginTop: 13,
                  flexShrink: 0,
                  transition: 'background-color 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Btn Styles ─────────────────────────────────────────────────────────────────
const btnPrimary = {
  backgroundColor: T.ink,
  color: T.chalk,
  border: 'none',
  borderRadius: 8,
  padding: '12px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'opacity 0.15s',
};
const btnSecondary = {
  backgroundColor: T.parchment,
  color: T.ink,
  border: `1.5px solid ${T.pencil}`,
  borderRadius: 8,
  padding: '11px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};
const btnGhost = {
  backgroundColor: 'transparent',
  color: T.graphite,
  border: 'none',
  borderRadius: 8,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

// ── Interest Chip Input ────────────────────────────────────────────────────────
function InterestChipInput({ interests, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !interests.includes(trimmed)) {
      onChange([...interests, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag) => onChange(interests.filter((i) => i !== tag));

  return (
    <div
      style={{
        border: `1.5px solid ${T.pencil}`,
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: T.chalk,
        minHeight: 44,
      }}
    >
      {interests.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: T.parchment,
            border: `1px solid ${T.pencil}`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: T.ink,
            fontFamily: 'var(--font-body)',
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <X size={11} color={T.graphite} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          }
          if (e.key === 'Backspace' && !input && interests.length) {
            onChange(interests.slice(0, -1));
          }
        }}
        onBlur={() => { if (input) addTag(input); }}
        placeholder={interests.length ? '' : 'Type interest, press Enter...'}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          color: T.ink,
          backgroundColor: 'transparent',
          minWidth: 120,
          flex: 1,
        }}
      />
    </div>
  );
}

// ── Step 1: Students ───────────────────────────────────────────────────────────
function Step1Students({
  students,
  studentsLoading,
  questType,
  setQuestType,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudentIds,
  setSelectedStudentIds,
  selectedInterests,
  setSelectedInterests,
  onNext,
}) {
  const [search, setSearch] = useState('');

  const individualStudent = students.find((s) => s.id === selectedStudentId);
  const groupStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Shared interests for group
  const sharedInterests =
    groupStudents.length >= 2
      ? arrayIntersection(groupStudents.map((s) => s.interests || []))
      : groupStudents.length === 1
      ? groupStudents[0]?.interests || []
      : [];

  // Pre-fill interests when student selection changes
  useEffect(() => {
    if (questType === 'individual' && individualStudent) {
      setSelectedInterests(individualStudent.interests || []);
    } else if (questType === 'group' && groupStudents.length > 0) {
      setSelectedInterests(sharedInterests.length > 0 ? sharedInterests : groupStudents.flatMap((s) => s.interests || []).filter((v, i, a) => a.indexOf(v) === i));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questType, selectedStudentId, selectedStudentIds.join(',')]);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const canProceed =
    questType === 'individual'
      ? !!selectedStudentId
      : selectedStudentIds.length >= 1;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 24px' }}>
        Who is this quest for?
      </h2>

      {studentsLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: T.graphite }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: T.parchment,
            borderRadius: 12,
            color: T.graphite,
          }}
        >
          <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            You haven't added any students yet.
          </p>
          <Link
            to="/dashboard"
            style={{ color: T.labBlue, fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'none' }}
          >
            Go to Dashboard to add students
          </Link>
        </div>
      ) : (
        <>
          {/* Quest type toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, border: `1.5px solid ${T.pencil}`, borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
            {[
              { key: 'individual', label: 'Individual', Icon: User },
              { key: 'group', label: 'Group', Icon: Users },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setQuestType(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: questType === key ? T.ink : T.chalk,
                  color: questType === key ? T.chalk : T.graphite,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Individual: searchable dropdown */}
          {questType === 'individual' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                Select student
              </label>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1.5px solid ${T.pencil}`,
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: T.ink,
                    backgroundColor: T.chalk,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setSearch(''); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: `1.5px solid ${selectedStudentId === s.id ? T.ink : T.pencil}`,
                      borderRadius: 8,
                      backgroundColor: selectedStudentId === s.id ? T.parchment : T.chalk,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                        {s.grade_band} · {(s.interests || []).slice(0, 3).join(', ')}
                      </div>
                    </div>
                    {selectedStudentId === s.id && <Check size={16} color={T.fieldGreen} />}
                  </button>
                ))}
              </div>

              {/* Selected student card */}
              {individualStudent && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '14px 16px',
                    backgroundColor: T.parchment,
                    borderRadius: 10,
                    border: `1px solid ${T.pencil}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                    {individualStudent.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(individualStudent.interests || []).map((interest) => (
                      <span
                        key={interest}
                        style={{
                          backgroundColor: T.chalk,
                          border: `1px solid ${T.pencil}`,
                          borderRadius: 20,
                          padding: '3px 10px',
                          fontSize: 11,
                          color: T.ink,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group: multi-select */}
          {questType === 'group' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                Select students
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {students.map((s) => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        border: `1.5px solid ${checked ? T.ink : T.pencil}`,
                        borderRadius: 8,
                        backgroundColor: checked ? T.parchment : T.chalk,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                          else setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                        }}
                        style={{ width: 16, height: 16, accentColor: T.ink, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                          {s.grade_band} · {(s.interests || []).slice(0, 3).join(', ')}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Shared interests callout */}
              {groupStudents.length >= 2 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    backgroundColor: T.parchment,
                    borderRadius: 8,
                    borderLeft: `4px solid ${T.compassGold}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Shared interests
                  </div>
                  {sharedInterests.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {sharedInterests.map((interest) => (
                        <span
                          key={interest}
                          style={{ backgroundColor: T.chalk, border: `1px solid ${T.pencil}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: T.ink, fontFamily: 'var(--font-body)' }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
                      No shared interests found — AI will blend their unique interests.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interest override */}
          {(questType === 'individual' ? !!selectedStudentId : selectedStudentIds.length > 0) && (
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                Interests for this quest
                <span style={{ fontWeight: 400, color: T.graphite, marginLeft: 6 }}>(add or remove)</span>
              </label>
              <InterestChipInput interests={selectedInterests} onChange={setSelectedInterests} />
            </div>
          )}

          <button
            onClick={onNext}
            disabled={!canProceed}
            style={{ ...btnPrimary, opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed', width: '100%' }}
          >
            Next: Choose Skills
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 2: Skills ─────────────────────────────────────────────────────────────
const SUBJECT_TABS = [
  { id: 'math',      label: 'Math' },
  { id: 'ela',       label: 'ELA' },
  { id: 'science',   label: 'Science' },
  { id: 'ss',        label: 'Social Studies' },
  { id: 'practices', label: 'Math Practices' },
];

function Step2Skills({
  selectedStandards,
  setSelectedStandards,
  customTopic,
  setCustomTopic,
  selectedStudents,
  onBack,
  onNext,
}) {
  const [activeSubject, setActiveSubject] = useState('math');
  const [activeGradeBand, setActiveGradeBand] = useState('all');
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState({});

  // Grade bands available for the current subject
  const gradeBands = ['all', ...new Set(
    STANDARDS_FRAMEWORKS
      .filter((fw) => fw.subject === activeSubject)
      .map((fw) => fw.gradeBand)
  )];

  // Frameworks to show based on subject + grade band filter
  const visibleFrameworks = STANDARDS_FRAMEWORKS.filter((fw) => {
    if (fw.subject !== activeSubject) return false;
    if (activeGradeBand !== 'all' && fw.gradeBand !== activeGradeBand) return false;
    return true;
  });

  // Filter standards by search query
  const searchLower = search.toLowerCase();
  const matchesSearch = (std) =>
    !search ||
    std.label.toLowerCase().includes(searchLower) ||
    std.description.toLowerCase().includes(searchLower);

  const count = selectedStandards.length;
  const usingCustomTopic = customTopic.trim().length > 0;
  const isValid = usingCustomTopic || (count >= 2 && count <= 6);

  // AI suggestions based on grade band of first selected student
  const gradeBand = selectedStudents[0]?.grade_band || '3-5';
  const suggestedIds = AI_SUGGESTIONS_BY_GRADE[gradeBand] || AI_SUGGESTIONS_BY_GRADE['3-5'];
  const suggestions = suggestedIds
    .map((id) => findStandardById(id))
    .filter(Boolean)
    .filter((s) => !selectedStandards.find((sel) => sel.id === s.id));

  const toggleStandard = (standard) => {
    const exists = selectedStandards.find((s) => s.id === standard.id);
    if (exists) {
      setSelectedStandards(selectedStandards.filter((s) => s.id !== standard.id));
    } else {
      setSelectedStandards([...selectedStandards, standard]);
    }
  };

  const toggleCategory = (key) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // When subject changes, reset grade band and search
  const handleSubjectChange = (subj) => {
    setActiveSubject(subj);
    setActiveGradeBand('all');
    setSearch('');
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        What skills should this quest build?
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite, margin: '0 0 20px' }}>
        Select 2–6 standards, or describe a custom topic below.
      </p>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {SUBJECT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubjectChange(tab.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: `1.5px solid ${activeSubject === tab.id ? T.ink : T.pencil}`,
              backgroundColor: activeSubject === tab.id ? T.ink : T.chalk,
              color: activeSubject === tab.id ? T.chalk : T.graphite,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grade band sub-filter (only when > 1 option) */}
      {gradeBands.length > 2 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {gradeBands.map((gb) => (
            <button
              key={gb}
              onClick={() => setActiveGradeBand(gb)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${activeGradeBand === gb ? T.compassGold : T.pencil}`,
                backgroundColor: activeGradeBand === gb ? `${T.compassGold}15` : 'transparent',
                color: activeGradeBand === gb ? T.compassGold : T.graphite,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {gb === 'all' ? 'All Grades' : gb}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search
          size={14}
          color={T.pencil}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search standards by code or keyword..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px 8px 30px',
            borderRadius: 8,
            border: `1px solid ${T.pencil}`,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: T.ink,
            background: T.chalk,
            outline: 'none',
          }}
        />
      </div>

      {/* AI Suggestions (if no search) */}
      {!search && suggestions.length > 0 && (
        <div
          style={{
            backgroundColor: T.parchment,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
            borderLeft: `4px solid ${T.compassGold}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Suggested for {gradeBand} learners
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((std) => (
              <div key={std.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <div style={{ lineHeight: 1.5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.ink, marginRight: 6 }}>{std.label}</span>
                  <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>{std.description}</span>
                </div>
                <button
                  onClick={() => setSelectedStandards([...selectedStandards, std])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '4px 10px', borderRadius: 20, marginTop: 1,
                    border: `1px solid ${T.compassGold}`, backgroundColor: 'transparent',
                    color: T.compassGold, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accordion — frameworks + categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
        {visibleFrameworks.map((fw) => {
          // Filter categories/standards by search
          const filteredCats = fw.categories.map((cat) => ({
            ...cat,
            standards: cat.standards.filter(matchesSearch),
          })).filter((cat) => cat.standards.length > 0);

          if (filteredCats.length === 0) return null;

          return filteredCats.map((cat) => {
            const catKey = `${fw.id}_${cat.id}`;
            const isOpen = search ? true : !!openCategories[catKey];
            const selectedInCat = cat.standards.filter((s) => selectedStandards.find((sel) => sel.id === s.id)).length;

            return (
              <div key={catKey} style={{ border: `1px solid ${T.pencil}`, borderRadius: 8 }}>
                <button
                  onClick={() => !search && toggleCategory(catKey)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box',
                    justifyContent: 'space-between', padding: '11px 14px',
                    background: isOpen ? T.parchment : T.chalk,
                    border: 'none',
                    borderRadius: isOpen ? '8px 8px 0 0' : 8,
                    cursor: search ? 'default' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flexShrink: 0, lineHeight: '20px' }}>{cat.label}</span>
                    {fw.gradeBand !== 'All' && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: T.compassGold, background: `${T.compassGold}18`,
                        borderRadius: 100, padding: '2px 7px',
                        border: `1px solid ${T.compassGold}40`, flexShrink: 0, lineHeight: '14px',
                      }}>
                        {fw.gradeBand}
                      </span>
                    )}
                    {selectedInCat > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.chalk, backgroundColor: T.fieldGreen, borderRadius: 20, padding: '2px 6px', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {selectedInCat}
                      </span>
                    )}
                  </div>
                  {!search && (isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />)}
                </button>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.parchment}`, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                    {cat.standards.map((std) => {
                      const checked = !!selectedStandards.find((s) => s.id === std.id);
                      return (
                        <label
                          key={std.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '9px 14px', cursor: 'pointer',
                            backgroundColor: checked ? '#F0F9F4' : 'transparent',
                            borderBottom: `1px solid ${T.parchment}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStandard(std)}
                            style={{ accentColor: T.fieldGreen, cursor: 'pointer', flexShrink: 0, width: 14, height: 14, marginTop: 3 }}
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 6px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                              {std.label}
                            </span>
                            <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                              {std.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })}
        {visibleFrameworks.every((fw) =>
          fw.categories.every((cat) => cat.standards.filter(matchesSearch).length === 0)
        ) && search && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13 }}>
            No standards match "{search}"
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selectedStandards.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {selectedStandards.map((std) => (
            <span
              key={std.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                backgroundColor: T.ink, color: T.chalk,
                borderRadius: 20, padding: '4px 10px',
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              }}
            >
              {std.label}
              <button
                onClick={() => toggleStandard(std)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.7 }}
              >
                <X size={11} color={T.chalk} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Counter */}
      {!usingCustomTopic && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, marginBottom: 12,
          color: count >= 2 && count <= 6 ? T.fieldGreen : T.specimenRed,
        }}>
          {count} selected · need 2–6 to continue
        </div>
      )}

      {/* Custom topic divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: T.pencil }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: T.graphite, whiteSpace: 'nowrap' }}>
          or describe a custom topic
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: T.pencil }} />
      </div>

      {/* Custom topic input */}
      <textarea
        value={customTopic}
        onChange={(e) => setCustomTopic(e.target.value)}
        placeholder="e.g. Introduction to personal finance, creative writing through mythology, environmental design..."
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1.5px solid ${customTopic.trim() ? T.compassGold : T.pencil}`,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: T.ink,
          background: customTopic.trim() ? `${T.compassGold}08` : T.chalk,
          outline: 'none',
          resize: 'none',
          marginBottom: 20,
          lineHeight: 1.5,
          transition: 'border-color 0.2s',
        }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={btnSecondary}>Back</button>
        <button
          onClick={onNext}
          disabled={!isValid}
          style={{ ...btnPrimary, flex: 1, opacity: isValid ? 1 : 0.4, cursor: isValid ? 'pointer' : 'not-allowed' }}
        >
          Next: Career Pathway
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Pathway ────────────────────────────────────────────────────────────
function Step3Pathway({ selectedPathways, setSelectedPathways, customCareer, setCustomCareer, onBack, onNext, onSkip }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const MAX_SELECT = 3;

  function togglePathway(id) {
    setSelectedPathways((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_SELECT) return prev; // cap at 3
      return [...prev, id];
    });
  }

  const filtered = CAREER_PATHWAYS.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.label.toLowerCase().includes(q) || p.tags.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Connect to a career pathway?
      </h2>
      <p style={{ color: T.graphite, fontSize: 14, fontFamily: 'var(--font-body)', margin: '0 0 16px' }}>
        Optional — choose up to {MAX_SELECT}. The AI will weave them into a real-world simulation.
      </p>

      {/* Selected chips */}
      {selectedPathways.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {selectedPathways.map((id) => {
            const p = CAREER_PATHWAYS.find((pw) => pw.id === id);
            if (!p) return null;
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `${p.color}14`, border: `1.5px solid ${p.color}`,
                  borderRadius: 100, padding: '3px 10px 3px 8px',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: p.color,
                }}
              >
                <p.Icon size={12} color={p.color} />
                {p.label}
                <button
                  onClick={() => togglePathway(id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: p.color }}
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} color={T.graphite} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search careers…"
          style={{
            width: '100%', padding: '8px 12px 8px 30px',
            border: `1px solid ${T.pencil}`, borderRadius: 8,
            fontFamily: 'var(--font-body)', fontSize: 13, color: T.ink,
            background: T.chalk, outline: 'none',
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {PATHWAY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '4px 12px', borderRadius: 100, border: '1px solid',
              borderColor: activeCategory === cat.id ? T.ink : T.pencil,
              background: activeCategory === cat.id ? T.ink : 'transparent',
              color: activeCategory === cat.id ? T.chalk : T.graphite,
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: activeCategory === cat.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pathway grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8,
          maxHeight: 320,
          overflowY: 'auto',
          marginBottom: 16,
          paddingRight: 2,
        }}
      >
        {filtered.map((pathway) => {
          const isSelected = selectedPathways.includes(pathway.id);
          const { Icon } = pathway;
          return (
            <button
              key={pathway.id}
              onClick={() => togglePathway(pathway.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 6, padding: '10px 12px',
                border: `1.5px solid ${isSelected ? pathway.color : T.pencil}`,
                borderRadius: 10,
                backgroundColor: isSelected ? `${pathway.color}10` : T.chalk,
                cursor: selectedPathways.length >= MAX_SELECT && !isSelected ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.12s',
                opacity: selectedPathways.length >= MAX_SELECT && !isSelected ? 0.45 : 1,
                position: 'relative',
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 16, height: 16, borderRadius: '50%',
                    background: pathway.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={10} color="#fff" strokeWidth={3} />
                </span>
              )}
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${pathway.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={pathway.color} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', lineHeight: 1.3, marginBottom: 3 }}>
                  {pathway.label}
                </div>
                <div style={{ fontSize: 10, color: T.graphite, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', lineHeight: 1.4 }}>
                  {pathway.tags.split(' · ').slice(0, 2).join(' · ')}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13, padding: '24px 0' }}>
            No careers found. Try a different search.
          </p>
        )}
      </div>

      {/* Custom career input */}
      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px dashed ${T.pencil}`, borderRadius: 10 }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: T.graphite, marginBottom: 6 }}>
          + Add your own career (optional)
        </label>
        <input
          value={customCareer}
          onChange={(e) => setCustomCareer(e.target.value)}
          placeholder="e.g., Forensic Accountant, Urban Farmer, AI Ethicist…"
          style={{
            width: '100%', padding: '8px 12px',
            border: `1px solid ${customCareer ? T.ink : T.pencil}`, borderRadius: 8,
            fontFamily: 'var(--font-body)', fontSize: 13, color: T.ink,
            background: T.chalk, outline: 'none',
          }}
        />
      </div>

      <button onClick={onSkip} style={{ ...btnGhost, width: '100%', marginBottom: 12, color: T.graphite, border: `1px dashed ${T.pencil}`, borderRadius: 8 }}>
        Skip Career Pathway
      </button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={btnSecondary}>Back</button>
        <button onClick={onNext} style={{ ...btnPrimary, flex: 1 }}>
          Generate Quest
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Generating ─────────────────────────────────────────────────────────
function Step4Generating({ progress, loadingText, error, onRegenerate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
      {error ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={`${T.specimenRed}20`} stroke={T.specimenRed} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke={T.specimenRed} strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke={T.specimenRed} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '0 0 8px' }}>
            Generation failed
          </h3>
          <p style={{ color: T.specimenRed, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            {error}
          </p>
          <button onClick={onRegenerate} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <CompassSpinner />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '0 0 8px' }}>
            Generating your quest...
          </h3>
          <p
            style={{
              color: T.graphite,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              marginBottom: 32,
              minHeight: 22,
              transition: 'opacity 0.3s',
            }}
          >
            {loadingText}
          </p>

          {/* Progress bar */}
          <div
            style={{
              height: 4,
              backgroundColor: T.parchment,
              borderRadius: 2,
              overflow: 'hidden',
              width: 300,
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: T.compassGold,
                borderRadius: 2,
                width: `${progress}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'var(--font-mono)', color: T.pencil }}>
            {Math.round(progress)}%
          </div>
        </>
      )}
    </div>
  );
}

// ── Stage Type Icon ────────────────────────────────────────────────────────────
function StageTypeIcon({ type, size = 14 }) {
  const Icon = STAGE_ICONS[type] || BookOpen;
  return <Icon size={size} color={T.graphite} />;
}

// ── Step 5: Review ─────────────────────────────────────────────────────────────
function Step5Review({
  generatedQuest,
  setGeneratedQuest,
  selectedStandards,
  selectedPathways,
  questType,
  selectedStudents,
  onLaunch,
  onDraft,
  onRegenerate,
  onAddToLibrary,
  launching,
  saveError,
}) {
  const [openStage, setOpenStage] = useState(null);

  if (!generatedQuest) return null;

  const stages = generatedQuest.stages || [];

  // Standards coverage
  const standardsCoverage = selectedStandards.map((std) => {
    const coveringStage = stages.find((stage) =>
      (stage.academic_skills_embedded || []).includes(std.id)
    );
    return { ...std, covered: !!coveringStage, coveringStage: coveringStage?.stage_title };
  });

  const updateField = (field, value) => {
    setGeneratedQuest((prev) => ({ ...prev, [field]: value }));
  };

  const updateStage = (index, field, value) => {
    setGeneratedQuest((prev) => {
      const newStages = [...prev.stages];
      newStages[index] = { ...newStages[index], [field]: value };
      return { ...prev, stages: newStages };
    });
  };

  const pathwayObjects = (selectedPathways || []).map((id) => CAREER_PATHWAYS.find((p) => p.id === id)).filter(Boolean);

  const studentNames = selectedStudents.map((s) => s.name).join(', ');

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 24px' }}>
        Review your quest
      </h2>

      {/* Quest header */}
      <div
        style={{
          backgroundColor: T.chalk,
          border: `1px solid ${T.pencil}`,
          borderRadius: 12,
          padding: '20px',
          marginBottom: 20,
        }}
      >
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateField('quest_title', e.currentTarget.textContent)}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: T.ink,
            margin: '0 0 6px',
            outline: 'none',
            cursor: 'text',
            borderBottom: `1px dashed transparent`,
          }}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = T.pencil)}
          onBlurCapture={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
        >
          {generatedQuest.quest_title}
        </h1>
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateField('quest_subtitle', e.currentTarget.textContent)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: T.graphite,
            margin: '0 0 14px',
            outline: 'none',
            cursor: 'text',
          }}
        >
          {generatedQuest.quest_subtitle}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          {pathwayObjects.map((pw) => (
            <span
              key={pw.id}
              style={{
                backgroundColor: `${pw.color}15`,
                color: pw.color,
                border: `1px solid ${pw.color}40`,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {pw.label}
            </span>
          ))}
          <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
            {studentNames}
          </span>
          <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
            {generatedQuest.total_duration} days
          </span>
        </div>

        {/* Narrative hook */}
        <div
          style={{
            backgroundColor: T.parchment,
            borderLeft: `4px solid ${T.compassGold}`,
            borderRadius: '0 8px 8px 0',
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Narrative Hook
          </div>
          <textarea
            defaultValue={generatedQuest.narrative_hook}
            onBlur={(e) => updateField('narrative_hook', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: T.ink,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Journey map — circles spread evenly across full width */}
      <div style={{ marginBottom: 20 }}>
        {/* Row 1: circles + flex dashes */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {stages.map((stage, i) => {
            const isLast = i === stages.length - 1;
            const isSim = stage.stage_type === 'simulate';
            return (
              <React.Fragment key={i}>
                <div
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => setOpenStage(openStage === i ? null : i)}
                >
                  {isLast ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: T.compassGold, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${T.compassGold}30` }}>
                      <Trophy size={15} color={T.chalk} />
                    </div>
                  ) : isSim ? (
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 26, height: 26, transform: 'rotate(45deg)', backgroundColor: T.specimenRed, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                        <span style={{ transform: 'rotate(-45deg)', fontSize: 10, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{i + 1}</span>
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div style={{ flex: 1, height: 0, borderTop: `2px dashed ${T.pencil}`, minWidth: 8 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Row 2: stage labels aligned with circles */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 8 }}>
          {stages.map((stage, i) => (
            <React.Fragment key={i}>
              <div
                onClick={() => setOpenStage(openStage === i ? null : i)}
                style={{ flexShrink: 0, width: 36, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 9, color: T.graphite, fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.3, display: 'block', wordBreak: 'break-word' }}>
                  {stage.stage_title || stage.title}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div style={{ flex: 1, minWidth: 8 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stage cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {stages.map((stage, i) => {
          const isOpen = openStage === i;
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${T.pencil}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setOpenStage(isOpen ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: isOpen ? T.parchment : T.chalk,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: T.ink,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 3 }}>
                    {stage.stage_title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StageTypeIcon type={stage.stage_type} size={12} />
                      <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>
                        {stage.stage_type}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                      {stage.duration} days
                    </span>
                    {(stage.academic_skills_embedded || []).slice(0, 2).map((skill) => {
                      const std = findStandardById(skill);
                      return std ? (
                        <span
                          key={skill}
                          style={{
                            backgroundColor: T.parchment,
                            border: `1px solid ${T.pencil}`,
                            borderRadius: 10,
                            padding: '2px 7px',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            color: T.graphite,
                          }}
                        >
                          {std.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />}
              </button>

              {isOpen && (
                <div style={{ padding: '14px', borderTop: `1px solid ${T.pencil}` }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                      Description
                    </label>
                    <textarea
                      defaultValue={stage.description}
                      onBlur={(e) => updateStage(i, 'description', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        border: `1px solid ${T.pencil}`,
                        borderRadius: 6,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontFamily: 'var(--font-body)',
                        color: T.ink,
                        lineHeight: 1.6,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {(stage.guiding_questions || []).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                        Guiding Questions
                      </label>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(stage.guiding_questions || []).map((q, qi) => (
                          <li key={qi} style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 4 }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage.deliverable && (
                    <div
                      style={{
                        backgroundColor: T.parchment,
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                        Deliverable
                      </div>
                      <textarea
                        defaultValue={stage.deliverable}
                        onBlur={(e) => updateStage(i, 'deliverable', e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 12,
                          fontFamily: 'var(--font-body)',
                          color: T.ink,
                          lineHeight: 1.5,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Standards coverage */}
      <div
        style={{
          border: `1px solid ${T.pencil}`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 24,
          backgroundColor: T.chalk,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 12 }}>
          Standards Coverage
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {standardsCoverage.map((std) => (
            <div key={std.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: std.covered ? T.fieldGreen : T.specimenRed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {std.covered ? (
                  <Check size={10} color={T.chalk} strokeWidth={3} />
                ) : (
                  <X size={10} color={T.chalk} strokeWidth={3} />
                )}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.ink, marginRight: 6 }}>{std.label}</span>
                <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>{std.description}</span>
                {std.covered && std.coveringStage && (
                  <div style={{ fontSize: 10, color: T.fieldGreen, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                    Covered in: {std.coveringStage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#B91C1C', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          {saveError}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onLaunch}
          disabled={launching}
          style={{
            ...btnPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: launching ? 0.7 : 1,
            cursor: launching ? 'not-allowed' : 'pointer',
          }}
        >
          {launching ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {launching ? 'Launching...' : 'Launch Quest'}
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDraft} disabled={launching} style={{ ...btnSecondary, flex: 1 }}>
            Save as Draft
          </button>
          <button onClick={onRegenerate} disabled={launching} style={btnGhost}>
            Regenerate
          </button>
          <button onClick={onAddToLibrary} disabled={launching} style={btnGhost}>
            Add to Library
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 6: Launch ─────────────────────────────────────────────────────────────
function Step6Launch({ selectedStudents, questId }) {
  const names = selectedStudents.map((s) => s.name).join(' & ');

  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <style>{`
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div style={{ marginBottom: 20 }}>
        <AnimatedCheck />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, margin: '0 0 8px' }}>
        Quest launched!
      </h2>
      <p style={{ color: T.graphite, fontSize: 15, fontFamily: 'var(--font-body)', margin: '0 0 32px' }}>
        {names ? `${names}'s quest is ready.` : 'Your quest is ready.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {questId && (
          <Link
            to={`/quest/${questId}`}
            style={{
              ...btnPrimary,
              display: 'inline-block',
              textDecoration: 'none',
              textAlign: 'center',
              minWidth: 200,
            }}
          >
            View Quest Map
          </Link>
        )}
        <Link
          to="/dashboard"
          style={{
            ...btnSecondary,
            display: 'inline-block',
            textDecoration: 'none',
            textAlign: 'center',
            minWidth: 200,
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function QuestBuilder() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  function getInitials(n) { if (!n) return '?'; const p = n.trim().split(/\s+/); return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase(); }

  // Step state
  const [step, setStep] = useState(1);

  // Step 1
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [questType, setQuestType] = useState('individual');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Step 2
  const [selectedStandards, setSelectedStandards] = useState([]);
  const [customTopic, setCustomTopic] = useState('');

  // Step 3
  const [selectedPathways, setSelectedPathways] = useState([]);
  const [customCareer, setCustomCareer] = useState('');

  // Step 4
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [genError, setGenError] = useState(null);

  // Step 5
  const [generatedQuest, setGeneratedQuest] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Step 6
  const [launchedQuestId, setLaunchedQuestId] = useState(null);

  // Refs for generation timers
  const progressRef = useRef(null);
  const textRef = useRef(null);

  // Fetch students
  useEffect(() => {
    if (!user) return;
    setStudentsLoading(true);
    supabase
      .from('students')
      .select('*')
      .eq('guide_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) setStudents(data);
        setStudentsLoading(false);
      });
  }, [user]);

  // Derived: selected students array
  const selectedStudents =
    questType === 'individual'
      ? students.filter((s) => s.id === selectedStudentId)
      : students.filter((s) => selectedStudentIds.includes(s.id));

  const selectedStudentIdsForSave =
    questType === 'individual'
      ? selectedStudentId
        ? [selectedStudentId]
        : []
      : selectedStudentIds;

  // Generation effect
  const runGeneration = useCallback(async () => {
    setGenError(null);
    setProgress(0);

    // Start progress animation: 0 → 90 over 8 seconds
    const startTime = Date.now();
    const duration = 8000;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(90, (elapsed / duration) * 90);
      setProgress(pct);
      if (pct < 90) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    // Cycle loading texts every 2s
    let textIdx = 0;
    setLoadingTextIdx(0);
    textRef.current = setInterval(() => {
      textIdx = (textIdx + 1) % LOADING_TEXTS.length;
      setLoadingTextIdx(textIdx);
    }, 2000);

    try {
      const pathwayLabels = selectedPathways
        .map((id) => CAREER_PATHWAYS.find((p) => p.id === id)?.label)
        .filter(Boolean);
      if (customCareer.trim()) pathwayLabels.push(customCareer.trim());

      const standardsStr = selectedStandards.length > 0
        ? selectedStandards.map((s) => `${s.id}: ${s.description}`).join('; ')
        : customTopic.trim() || 'general inquiry skills';

      const questData = await ai.generateQuest({
        interests: selectedInterests.join(', '),
        ageGrade: selectedStudents.map((s) => `${s.name} age ${s.age || '10'}`).join(', '),
        standards: standardsStr,
        pathway: pathwayLabels.length > 0 ? pathwayLabels.join(', ') : 'none',
        type: questType,
        count: selectedStudents.length,
      });

      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);

      // Animate to 100%
      setProgress(100);
      setGeneratedQuest(questData);

      // Auto-advance after 600ms
      setTimeout(() => setStep(5), 600);
    } catch (err) {
      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);
      setGenError(err?.message || 'Something went wrong. Please try again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterests, selectedStudents, selectedStandards, selectedPathways, customCareer, questType]);

  useEffect(() => {
    if (step === 4) {
      runGeneration();
    }
    return () => {
      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Save quest (shared by launch and draft)
  const saveQuest = async (status) => {
    if (!generatedQuest) return null;
    setSaveError(null);
    setLaunching(true);
    try {
      // Save quest
      const { data: quest, error: questError } = await supabase
        .from('quests')
        .insert({
          guide_id: user.id,
          title: generatedQuest.quest_title,
          subtitle: generatedQuest.quest_subtitle,
          narrative_hook: generatedQuest.narrative_hook,
          career_pathway: selectedPathways[0] || null,
          quest_type: questType,
          status,
          total_duration_days: generatedQuest.total_duration,
          academic_standards: selectedStandards.map((s) => s.id),
          reflection_prompts: generatedQuest.reflection_prompts,
          parent_summary: generatedQuest.parent_summary,
        })
        .select()
        .single();

      if (questError) throw questError;

      // Save stages
      if (generatedQuest.stages?.length) {
        const VALID_STAGE_TYPES = ['research', 'build', 'experiment', 'simulate', 'reflect', 'present'];
        // Map common AI-returned aliases to valid types
        const STAGE_TYPE_MAP = {
          create: 'build', investigate: 'research', explore: 'research',
          design: 'build', make: 'build', analyze: 'research', discuss: 'reflect',
          share: 'present', write: 'reflect', test: 'experiment',
        };
        const sanitizeType = (t) => {
          if (!t) return 'research';
          const lower = t.toLowerCase();
          if (VALID_STAGE_TYPES.includes(lower)) return lower;
          return STAGE_TYPE_MAP[lower] || 'research';
        };

        const { error: stagesError } = await supabase.from('quest_stages').insert(
          generatedQuest.stages.map((s, i) => ({
            quest_id: quest.id,
            stage_number: s.stage_number || i + 1,
            title: s.stage_title || s.title || `Stage ${i + 1}`,
            stage_type: sanitizeType(s.stage_type),
            duration_days: typeof s.duration === 'number' ? s.duration : parseInt(s.duration) || 1,
            description: s.description || '',
            academic_skills: Array.isArray(s.academic_skills_embedded) ? s.academic_skills_embedded : [],
            skill_note: s.skill_integration_note || null,
            deliverable: s.deliverable || null,
            guiding_questions: Array.isArray(s.guiding_questions) ? s.guiding_questions : [],
            resources: Array.isArray(s.resources_needed) ? s.resources_needed : [],
            status: i === 0 ? 'active' : 'locked',
          }))
        );
        if (stagesError) throw stagesError;
      }

      // Save simulation
      if (selectedPathways.length > 0 && generatedQuest.career_simulation) {
        await supabase.from('career_simulations').insert({
          quest_id: quest.id,
          ...generatedQuest.career_simulation,
          status: 'locked',
        });
      }

      // Assign students
      if (selectedStudentIdsForSave.length) {
        await supabase.from('quest_students').insert(
          selectedStudentIdsForSave.map((sid) => ({ quest_id: quest.id, student_id: sid }))
        );
      }

      return quest.id;
    } catch (err) {
      console.error('saveQuest error:', err);
      setSaveError(typeof err?.message === 'string' ? err.message : 'Failed to save quest. Check console for details.');
      return null;
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunch = async () => {
    const id = await saveQuest('active');
    if (id) {
      setLaunchedQuestId(id);
      setStep(6);
    }
  };

  const handleDraft = async () => {
    const id = await saveQuest('draft');
    if (id) {
      setLaunchedQuestId(id);
      navigate('/dashboard');
    }
  };

  const handleAddToLibrary = async () => {
    if (!generatedQuest) return;
    const { error } = await supabase.from('quest_templates').insert({
      guide_id: user.id,
      title: generatedQuest.quest_title,
      subtitle: generatedQuest.quest_subtitle,
      narrative_hook: generatedQuest.narrative_hook,
      career_pathway: selectedPathways[0] || null,
      quest_type: questType,
      total_duration_days: generatedQuest.total_duration,
      academic_standards: selectedStandards.map((s) => s.id),
      interest_tags: selectedInterests,
      grade_band: selectedStudents[0]?.grade_band || '3-5',
      usage_count: 0,
      is_public: false,
      stages_data: generatedQuest.stages || [],
      simulation_data: generatedQuest.career_simulation || null,
    });
    if (error) console.error('Add to Library error:', error.message);
  };

  const handleRegenerate = () => {
    setStep(4);
  };

  const handleSkipPathway = () => {
    setSelectedPathways([]);
    setCustomCareer('');
    setStep(4);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Page background */}
      <div style={{ minHeight: '100vh', backgroundColor: T.paper, fontFamily: 'var(--font-body)' }}>

        {/* TopBar */}
        <div
          style={{
            backgroundColor: T.chalk,
            borderBottom: '1px solid var(--pencil)',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Link
            to="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none',
            }}
          >
            <WayfinderLogoIcon size={22} color={T.ink} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: T.ink,
              letterSpacing: '-0.02em',
            }}>
              Wayfinder
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--graphite)',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              <ChevronLeft size={14} />
              Dashboard
            </Link>
            {profile && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lab-blue)', color: 'var(--chalk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0 }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : getInitials(profile.full_name)
                }
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '40px 24px',
          }}
        >
          {/* Step indicator (hide on step 4 generating and step 6 launched) */}
          {step !== 4 && step !== 6 && (
            <StepIndicator current={step} />
          )}

          {/* Step card */}
          <div
            style={{
              backgroundColor: T.chalk,
              borderRadius: 16,
              padding: step === 4 ? '40px 32px' : '32px',
              border: `1px solid ${T.parchment}`,
              boxShadow: '0 1px 6px rgba(26,26,46,0.06)',
            }}
          >
            {step === 1 && (
              <Step1Students
                students={students}
                studentsLoading={studentsLoading}
                questType={questType}
                setQuestType={(t) => { setQuestType(t); setSelectedStudentId(null); setSelectedStudentIds([]); setSelectedInterests([]); }}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={setSelectedStudentIds}
                selectedInterests={selectedInterests}
                setSelectedInterests={setSelectedInterests}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <Step2Skills
                selectedStandards={selectedStandards}
                setSelectedStandards={setSelectedStandards}
                customTopic={customTopic}
                setCustomTopic={setCustomTopic}
                selectedStudents={selectedStudents}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}

            {step === 3 && (
              <Step3Pathway
                selectedPathways={selectedPathways}
                setSelectedPathways={setSelectedPathways}
                customCareer={customCareer}
                setCustomCareer={setCustomCareer}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
                onSkip={handleSkipPathway}
              />
            )}

            {step === 4 && (
              <Step4Generating
                progress={progress}
                loadingText={LOADING_TEXTS[loadingTextIdx]}
                error={genError}
                onRegenerate={runGeneration}
              />
            )}

            {step === 5 && generatedQuest && (
              <Step5Review
                generatedQuest={generatedQuest}
                setGeneratedQuest={setGeneratedQuest}
                selectedStandards={selectedStandards}
                selectedPathways={selectedPathways}
                questType={questType}
                selectedStudents={selectedStudents}
                onLaunch={handleLaunch}
                onDraft={handleDraft}
                onRegenerate={handleRegenerate}
                onAddToLibrary={handleAddToLibrary}
                launching={launching}
                saveError={saveError}
              />
            )}

            {step === 6 && (
              <Step6Launch
                selectedStudents={selectedStudents}
                questId={launchedQuestId}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
