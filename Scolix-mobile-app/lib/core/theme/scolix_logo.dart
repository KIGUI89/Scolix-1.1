import 'package:flutter/material.dart';

enum ScolixLogoAsset {
  icon('assets/brand/scolix-icon-light.png'),
  wordmark('assets/brand/scolix-wordmark-light.png'),
  lockup('assets/brand/scolix-lockup-light.png');

  const ScolixLogoAsset(this.path);
  final String path;
}

/// Affiche un asset de marque Scolix (tracé noir sur fond transparent),
/// inversé en blanc sur fond sombre — équivalent du `filter: {{ logoFilter }}`
/// CSS appliqué côté maquette pour les deux thèmes.
class ScolixLogo extends StatelessWidget {
  const ScolixLogo(this.asset, {super.key, this.height});

  final ScolixLogoAsset asset;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final image = Image.asset(asset.path, height: height, fit: BoxFit.contain);

    if (!isDark) return image;

    return ColorFiltered(
      colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
      child: image,
    );
  }
}
