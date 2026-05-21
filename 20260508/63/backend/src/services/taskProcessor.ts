import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Task, TaskStatus } from '../entities/Task';
import { getTaskProgress } from './mockCdn';

const processingTaskIds = new Set<number>();

const processTask = async (task: Task, startTime: number) => {
  const taskRepo = AppDataSource.getRepository(Task);

  if (processingTaskIds.has(task.id)) {
    return;
  }
  processingTaskIds.add(task.id);

  try {
    const processStep = async () => {
      const elapsedMs = Date.now() - startTime;
      const progress = await getTaskProgress(task.id, task.totalCount, elapsedMs);

      const currentTask = await taskRepo.findOne({ where: { id: task.id } });
      if (!currentTask) {
        processingTaskIds.delete(task.id);
        return;
      }

      if (currentTask.status === 'success' || currentTask.status === 'failed') {
        processingTaskIds.delete(task.id);
        return;
      }

      const newProgress = Math.max(currentTask.progress, progress.progress);
      const newSuccessCount = Math.max(currentTask.successCount, progress.successCount);
      const newFailCount = Math.max(currentTask.failCount, progress.failCount);

      if (progress.status === 'success' || progress.status === 'failed') {
        await taskRepo.update(task.id, {
          status: progress.status as TaskStatus,
          progress: newProgress,
          successCount: newSuccessCount,
          failCount: newFailCount,
          completedAt: new Date(),
        });
        processingTaskIds.delete(task.id);
        return;
      }

      if (
        newProgress !== currentTask.progress ||
        newSuccessCount !== currentTask.successCount ||
        newFailCount !== currentTask.failCount
      ) {
        await taskRepo.update(task.id, {
          status: 'processing',
          progress: newProgress,
          successCount: newSuccessCount,
          failCount: newFailCount,
        });
      }

      setTimeout(processStep, 2000);
    };

    setTimeout(processStep, 1000);
  } catch (error) {
    processingTaskIds.delete(task.id);
    try {
      await taskRepo.update(task.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '未知错误',
        completedAt: new Date(),
      });
    } catch (e) {
      console.error('Failed to update task error status:', e);
    }
  }
};

export const startTaskProcessor = () => {
  const taskRepo = AppDataSource.getRepository(Task);

  setInterval(async () => {
    try {
      const pendingTasks = await taskRepo.find({
        where: { status: 'pending' },
        relations: ['domain', 'user'],
      });

      const eligibleTasks = pendingTasks.filter(t => !processingTaskIds.has(t.id));
      if (eligibleTasks.length === 0) return;

      const ids = eligibleTasks.map(t => t.id);
      await taskRepo.update({ id: In(ids) }, { status: 'processing' });

      const startTime = Date.now();
      for (const task of eligibleTasks) {
        processTask(task, startTime);
      }
    } catch (error) {
      console.error('Error in task processor loop:', error);
    }
  }, 3000);

  console.log('Task processor started');
};
