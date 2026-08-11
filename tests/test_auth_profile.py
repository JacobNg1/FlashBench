import ast
import secrets
import string
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_function(path, function_name, namespace):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    node = next(item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name == function_name)
    module = ast.Module(body=[node], type_ignores=[])
    exec(compile(module, str(path), "exec"), namespace)
    return namespace[function_name]


class ProfileModelTests(unittest.TestCase):
    def test_nano_id_shape_and_uniqueness(self):
        alphabet = string.ascii_letters + string.digits + "_-"
        generate = load_function(
            ROOT / "app/db.py",
            "generate_public_id",
            {"secrets": secrets, "NANO_ID_ALPHABET": alphabet},
        )
        values = {generate() for _ in range(200)}
        self.assertEqual(len(values), 200)
        self.assertTrue(all(len(value) == 12 for value in values))
        self.assertTrue(all(set(value) <= set(alphabet) for value in values))

    def test_public_user_hides_internal_id(self):
        public_user = load_function(ROOT / "app/auth.py", "public_user", {})
        result = public_user({
            "id": 17,
            "public_id": "NanoUser_123",
            "username": "teacher01",
            "nickname": "周老师",
            "created_at": "2026-08-12 08:00:00",
        })
        self.assertEqual(result["id"], "NanoUser_123")
        self.assertNotEqual(result["id"], 17)
        self.assertEqual(result["nickname"], "周老师")

    def test_registration_and_profile_contract(self):
        source = (ROOT / "app/auth.py").read_text(encoding="utf-8")
        self.assertIn("len(username) < 6", source)
        self.assertIn('@router.put("/profile"', source)
        self.assertIn('"nickname": user["nickname"] or user["username"]', source)


if __name__ == "__main__":
    unittest.main()
