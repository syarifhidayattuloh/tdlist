"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

type SortOption = "abjad-asc" | "time-asc";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("time-asc");
  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const tasksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  const calculateTimeRemaining = useCallback((deadline: string): number => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    return deadlineTime - now;
  }, []);

  const formatTimeRemaining = (remaining: number): string => {
    if (remaining <= 0) return "Waktu habis!";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    if (sortOption === "abjad-asc") {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    } else if (sortOption === "time-asc") {
      sorted.sort(
        (a, b) =>
          calculateTimeRemaining(a.deadline) -
          calculateTimeRemaining(b.deadline)
      );
    }
    return sorted;
  }, [tasks, sortOption, calculateTimeRemaining]);

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambah Kegiatan",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama kegiatan">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTask }]);
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil ditambahkan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const editTask = async (task: Task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Kegiatan",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama kegiatan">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const taskRef = doc(db, "tasks", task.id);
      try {
        await updateDoc(taskRef, {
          text: formValues[0],
          deadline: formValues[1],
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, text: formValues[0], deadline: formValues[1] }
              : t
          )
        );
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil diubah.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Tugas yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const toggleComplete = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      completed: !tasks.find((task) => task.id === id)?.completed,
    });
  };

  return (
    <div className="min-h-screen bg-orange-100">
      <div className="max-w-3xl mx-auto mt-10 p-4">
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-300 shadow-xl text-orange-900">
          <h1 className="text-2xl font-bold text-center mb-6">TO DO LIST</h1>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <button
              onClick={addTask}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold"
            >
              TAMBAH KEGIATAN
            </button>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              <option value="abjad-asc">Sort by name</option>
              <option value="time-asc">Sort by time</option>
            </select>
          </div>


          <div className="grid grid-cols-5 gap-4 font-semibold text-center text-orange-900 mb-2 px-6">
            <div className="">
              Kegiatan
            </div>
            <div className="">
              Deadline
            </div>
            <div className="relative flex items-center justify-center">
              <span>Sisa Waktu</span>
            </div>
          </div>

          <ul className="space-y-2 text-orange-900">
            <AnimatePresence>
              {sortedTasks.map((task) => {
                const timeLeft = calculateTimeRemaining(task.deadline);
                const isExpired = timeLeft <= 0;

                const rowColor = task.completed
                  ? "bg-orange-300"
                  : isExpired
                    ? "bg-orange-200"
                    : "bg-orange-100";

                return (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`grid grid-cols-5 gap-4 items-center text-center px-6 py-2 rounded-lg ${rowColor}`}
                  >
                    <div className="flex items-center space-x-2 justify-start">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleComplete(task.id)}
                        className="form-checkbox h-4 w-4 text-orange-600"
                      />
                      <span
                        className={`truncate max-w-[180px] text-left ${task.completed ? "line-through text-orange-700" : ""
                          }`}
                        title={task.text}
                      >
                        {task.text}
                      </span>
                    </div>
                    <div>{new Date(task.deadline).toLocaleDateString()}</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm">⏰</span>
                      <span>{formatTimeRemaining(timeLeft)}</span>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => editTask(task)}
                        className="text-orange-800 bg-orange-200 border border-orange-400 px-2 py-1 rounded hover:bg-orange-300 mr-2"
                      >
                        📝edit
                      </button>
                    </div>
                    <div className="text-left">
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-orange-800 bg-orange-200 border border-orange-400 px-2 py-1 rounded hover:bg-orange-300"
                      >
                        🗑️hapus
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}
