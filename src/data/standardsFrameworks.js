export const STANDARDS_FRAMEWORKS = [
  // ── MATH K-2 ──
  {
    id: 'math_k2', label: 'Common Core Math K\u20132', subject: 'math', gradeBand: 'K-2',
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
    id: 'math_35', label: 'Common Core Math 3\u20135', subject: 'math', gradeBand: '3-5',
    categories: [
      { id: 'oa', label: 'Operations & Algebraic Thinking', standards: [
        { id: 'CCSS.MATH.3.OA.A.3', label: '3.OA.A.3', description: 'Use multiplication and division within 100 to solve word problems' },
        { id: 'CCSS.MATH.4.OA.A.3', label: '4.OA.A.3', description: 'Solve multi-step word problems using the four operations' },
        { id: 'CCSS.MATH.5.OA.B.3', label: '5.OA.B.3', description: 'Analyze patterns and relationships on a coordinate plane' },
      ]},
      { id: 'nf', label: 'Number & Operations \u2014 Fractions', standards: [
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
    id: 'math_68', label: 'Common Core Math 6\u20138', subject: 'math', gradeBand: '6-8',
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
    id: 'ela_k2', label: 'ELA / Literacy K\u20132', subject: 'ela', gradeBand: 'K-2',
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
    id: 'ela_35', label: 'ELA / Literacy 3\u20135', subject: 'ela', gradeBand: '3-5',
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
    id: 'ela_68', label: 'ELA / Literacy 6\u20138', subject: 'ela', gradeBand: '6-8',
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
    id: 'ngss_k5', label: 'NGSS K\u20135', subject: 'science', gradeBand: 'K-5',
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
    id: 'ngss_68', label: 'NGSS 6\u20138', subject: 'science', gradeBand: '6-8',
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
    id: 'ngss_912', label: 'NGSS 9\u201312', subject: 'science', gradeBand: '9-12',
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

// Helper: find a standard object by id across all frameworks
export function findStandardById(id) {
  for (const fw of STANDARDS_FRAMEWORKS) {
    for (const cat of fw.categories) {
      const found = cat.standards.find((s) => s.id === id);
      if (found) return { ...found, subject: fw.subject, gradeBand: fw.gradeBand };
    }
  }
  return null;
}

// Helper: get all standards for a given grade band
export function getStandardsByGradeBand(gradeBand) {
  const results = [];
  for (const fw of STANDARDS_FRAMEWORKS) {
    if (fw.gradeBand === gradeBand || fw.gradeBand === 'All') {
      for (const cat of fw.categories) {
        for (const std of cat.standards) {
          results.push({ ...std, subject: fw.subject, gradeBand: fw.gradeBand, frameworkLabel: fw.label });
        }
      }
    }
  }
  return results;
}
