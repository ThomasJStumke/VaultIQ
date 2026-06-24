import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Module, Evidence } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const serializedError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serializedError);
  throw new Error(serializedError);
}

export const subscribeToModules = (callback: (modules: Module[]) => void) => {
  const path = 'modules';
  const q = query(collection(db, path), orderBy('code', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const modules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Module[];
    callback(modules);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToEvidence = (moduleId: string, callback: (evidence: Evidence[]) => void) => {
  const path = `modules/${moduleId}/evidence`;
  const q = query(
    collection(db, 'modules', moduleId, 'evidence'), 
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const evidence = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Evidence[];
    callback(evidence);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const uploadEvidenceMetadata = async (moduleId: string, evidence: Omit<Evidence, 'id' | 'createdAt'>) => {
  const path = `modules/${moduleId}/evidence`;
  try {
    return await addDoc(collection(db, 'modules', moduleId, 'evidence'), {
      ...evidence,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateModuleCompliance = async (moduleId: string, status: Module['complianceStatus']) => {
  const path = `modules/${moduleId}`;
  try {
    const moduleRef = doc(db, 'modules', moduleId);
    return await updateDoc(moduleRef, {
      complianceStatus: status,
      lastAuditAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addModule = async (moduleData: Omit<Module, 'id'>) => {
  const path = 'modules';
  try {
    return await addDoc(collection(db, 'modules'), {
      ...moduleData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateModule = async (moduleId: string, updates: Partial<Module>) => {
  const path = `modules/${moduleId}`;
  try {
    const moduleRef = doc(db, 'modules', moduleId);
    return await updateDoc(moduleRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  const path = 'users';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    callback(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const updateUserProfile = async (uid: string, updates: any) => {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    return await updateDoc(userRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addStaffMember = async (staffData: { displayName: string; email: string; role: any; departmentId: string }) => {
  const path = 'users';
  try {
    return await addDoc(collection(db, 'users'), {
      ...staffData,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToQuestionnaires = (callback: (questionnaires: any[]) => void) => {
  const path = 'questionnaires';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const addQuestionnaire = async (data: any) => {
  const path = 'questionnaires';
  try {
    return await addDoc(collection(db, 'questionnaires'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToStudentEvaluations = (callback: (evaluations: any[]) => void) => {
  const path = 'student_evaluations';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const addStudentEvaluation = async (data: any) => {
  const path = 'student_evaluations';
  try {
    return await addDoc(collection(db, 'student_evaluations'), {
      ...data,
      submittedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToDevelopmentPlans = (callback: (plans: any[]) => void) => {
  const path = 'development_plans';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const addDevelopmentPlan = async (data: any) => {
  const path = 'development_plans';
  try {
    return await addDoc(collection(db, 'development_plans'), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateDevelopmentPlan = async (planId: string, data: any) => {
  const path = `development_plans/${planId}`;
  try {
    return await updateDoc(doc(db, 'development_plans', planId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const initializeSeedData = async () => {
  const path = 'modules';
  try {
    const modulesSnap = await getDocs(collection(db, path));
    if (modulesSnap.empty) {
      const seedModules = [
        { code: 'AUDB201', name: 'Auditing Fundamentals', departmentId: 'FAI_AUD_TAX', lecturerUids: ['Mr. A'], complianceStatus: 'PENDING', assessmentMode: 'EXAM_BASED' },
        { code: 'PRG201', name: 'Technical Programming 2', departmentId: 'FAI_IT', lecturerUids: ['Prof. B'], complianceStatus: 'PENDING', assessmentMode: 'CONTINUOUS_ASSESSMENT' },
        { code: 'SYS111', name: 'Systems Analysis 1', departmentId: 'FAI_IS', lecturerUids: [], complianceStatus: 'COMPLIANT', assessmentMode: 'PROJECT_BASED' },
      ];
      
      for (const m of seedModules) {
        await addDoc(collection(db, path), m);
      }
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      const seedUsers = [
        { email: 'mr.a@university.edu', displayName: 'Mr. A', role: 'LECTURER', departmentId: 'FAI_AUD_TAX' },
        { email: 'prof.b@university.edu', displayName: 'Prof. B', role: 'LECTURER', departmentId: 'FAI_IT' },
        { email: 's.jenkins@university.edu', displayName: 'Dr. Sarah Jenkins', role: 'LECTURER', departmentId: 'FAI_FIN_ACC' },
        { email: 'admin@university.edu', displayName: 'James Wilson', role: 'FACULTY_ADMIN', departmentId: 'FAI' },
      ];
      for (const u of seedUsers) {
        await addDoc(collection(db, 'users'), u);
      }
    }

    // Seed evaluation questionnaire
    const qSnap = await getDocs(collection(db, 'questionnaires'));
    let defaultQId = '';
    if (qSnap.empty) {
      const masterQ = {
        title: "CQPA Institutional Module & Lecturer Evaluation Questionnaire",
        type: "UNIVERSAL",
        questions: [
          { id: "q1", text: "Lecturer starts lectures on time and displays professional punctuality", type: "RATING" },
          { id: "q2", text: "Module outcomes and materials are clearly articulated and aligned with higher education standards", type: "RATING" },
          { id: "q3", text: "Assessments are graded with constructive feedback and objective transparency", type: "RATING" },
          { id: "q4", text: "Quality and relevance of the text, slides, and supplementary guidelines", type: "RATING" }
        ],
        createdBy: "CQPA Unit Master",
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'questionnaires'), masterQ);
      defaultQId = docRef.id;
    } else {
      defaultQId = qSnap.docs[0].id;
    }

    // Seed evaluations
    const evalSnap = await getDocs(collection(db, 'student_evaluations'));
    if (evalSnap.empty && defaultQId) {
      const seedEvaluations = [
        // Evaluations for Mr. A (Auditing)
        { questionnaireId: defaultQId, moduleCode: 'AUDB201', lecturerUid: 'Mr. A', lecturerName: 'Mr. A', evaluatorType: 'STUDENT', ratings: { q1: 4, q2: 5, q3: 3, q4: 4 }, comments: "Great delivery, but grade turnaround takes too long.", submittedAt: new Date().toISOString() },
        { questionnaireId: defaultQId, moduleCode: 'AUDB201', lecturerUid: 'Mr. A', lecturerName: 'Mr. A', evaluatorType: 'STUDENT', ratings: { q1: 5, q2: 4, q3: 4, q4: 5 }, comments: "Very thorough auditee examples, very well connected.", submittedAt: new Date().toISOString() },
        
        // Evaluations for Prof. B (IT Programming)
        { questionnaireId: defaultQId, moduleCode: 'PRG201', lecturerUid: 'Prof. B', lecturerName: 'Prof. B', evaluatorType: 'STUDENT', ratings: { q1: 3, q2: 3, q3: 4, q4: 3 }, comments: "Tough programming syllabus, needs more tutorial worksheets.", submittedAt: new Date().toISOString() },
        { questionnaireId: defaultQId, moduleCode: 'PRG201', lecturerUid: 'Prof. B', lecturerName: 'Prof. B', evaluatorType: 'STUDENT', ratings: { q1: 5, q2: 5, q3: 5, q4: 4 }, comments: "Brilliant coder, really inspires his students!", submittedAt: new Date().toISOString() }
      ];

      for (const e of seedEvaluations) {
        await addDoc(collection(db, 'student_evaluations'), e);
      }
    }

    // Seed development plans
    const devSnap = await getDocs(collection(db, 'development_plans'));
    if (devSnap.empty) {
      const seedDevPlans = [
        {
          lecturerUid: 'Mr. A',
          lecturerName: 'Mr. A',
          moduleCode: 'AUDB201',
          areaOfImprovement: 'Assessments constructive grading & objective feedback turnaround times (Evaluation q3 factor)',
          suggestedAction: 'Establish standard 14-day grading cycle with detailed digital rubric transparency for each student test.',
          commitmentDate: '2026-07-15',
          status: 'COMMITTED',
          updateStatement: 'Rubric checklists configured. Implementation begins immediately on semester diagnostics.',
          updatedAt: new Date().toISOString()
        },
        {
          lecturerUid: 'Prof. B',
          lecturerName: 'Prof. B',
          moduleCode: 'PRG201',
          areaOfImprovement: 'Module syllabus presentation clarity & supplementary tutorial worksheets (Evaluation q4 factor)',
          suggestedAction: 'Create visual workspace examples and publish 3 supportive tutorial worksheets answering nested code criteria.',
          commitmentDate: '',
          status: 'PROPOSED',
          updateStatement: '',
          updatedAt: new Date().toISOString()
        }
      ];

      for (const dp of seedDevPlans) {
        await addDoc(collection(db, 'development_plans'), dp);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const deleteEvidence = async (moduleId: string, evidenceId: string) => {
  const path = `modules/${moduleId}/evidence/${evidenceId}`;
  try {
    const ref = doc(db, 'modules', moduleId, 'evidence', evidenceId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateEvidence = async (moduleId: string, evidenceId: string, updates: any) => {
  const path = `modules/${moduleId}/evidence/${evidenceId}`;
  try {
    const ref = doc(db, 'modules', moduleId, 'evidence', evidenceId);
    await updateDoc(ref, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToNotifications = (callback: (notifications: any[]) => void) => {
  const path = 'notifications';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  }, (error) => {
    // Graceful fallback if we hit permission or ordering issues (e.g. index build)
    const qSimple = query(collection(db, path));
    return onSnapshot(qSimple, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifications);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, path);
    });
  });
};

export const addNotification = async (notificationData: any) => {
  const path = 'notifications';
  try {
    return await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
