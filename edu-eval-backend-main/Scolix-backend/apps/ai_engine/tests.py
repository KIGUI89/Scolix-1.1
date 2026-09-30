from django.test import TestCase

from .services import KMeansService


class KMeansServiceTests(TestCase):
    def test_run_with_no_evaluations_does_not_crash(self):
        result = KMeansService.run(k=4)
        self.assertEqual(result, {"k": 0, "clusters": []})
