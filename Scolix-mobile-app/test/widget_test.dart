import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:scolix/app.dart';

void main() {
  testWidgets('App boots and renders without a stored session', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ScolixApp()));
    await tester.pump();

    // Le boot vérifie une éventuelle session stockée (aucune ici) puis
    // route vers /splash le temps de la restauration, sans planter.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
