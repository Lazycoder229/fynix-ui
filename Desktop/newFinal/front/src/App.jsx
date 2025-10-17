import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000/api/users";
function App() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
  });
  const [editId, setEditId] = useState(null);

  const fetchUsers = async () => {
    const res = await axios.get(API_URL);

    setUsers(res.data);
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await axios.put(`${API_URL}/${editId}`, form);
    } else {
      await axios.post(API_URL, form);
    }
    setForm({ name: "", email: "" });
    setEditId(null);
    fetchUsers();
  };
  const handleEdit = (user) => {
    setForm({ name: user.name, email: user.email });
    setEditId(user.id);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
    fetchUsers();
  };

  return (
    <>
      <h1>LAVALUST AND REACT</h1>
      <form action="" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Emai"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <button type="submit">
          {editId ? "Update" : "Add"}
          User
        </button>
      </form>

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.name} ({u.email}){""}
            <button onClick={() => handleEdit(u)}>Edit</button>
            <button onClick={() => handleDelete(u.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
