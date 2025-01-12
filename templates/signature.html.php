<!doctype html>
<html lang="fr_FR">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link href="/vendor/bootstrap.min.css?5.1.1" rel="stylesheet">
    <link href="/vendor/bootstrap-icons.css?1.8.1" rel="stylesheet">
    <link href="/css/app.css" rel="stylesheet">
    <title>Signature PDF</title>
  </head>
  <body class="bg-light">
    <noscript>
        <div class="alert alert-danger text-center" role="alert">
          <i class="bi bi-exclamation-triangle"></i> Site non fonctionnel sans JavaScript activé
        </div>
    </noscript>
    <div id="page-upload">
        <div class="px-4 py-5 my-5 text-center">
            <h1 class="display-5 fw-bold"><i class="bi bi-vector-pen"></i> Signer un PDF</h1>
            <div class="col-lg-3 mx-auto">
                <div class="col-12">
                  <label for="input_pdf_upload" class="form-label">Choisir un PDF</label>
                  <input id="input_pdf_upload" class="form-control form-control-lg" type="file" accept=".pdf,application/pdf">
                  <p class="mt-1 opacity-50"><small class="text-muted">Le PDF ne doit pas dépasser <?php echo round($maxSize / 1024 / 1024) ?> Mo et <?php echo $maxPage ?> pages</small></p>
                  <a class="btn btn-sm btn-link opacity-75" href="/signature#https://raw.githubusercontent.com/24eme/signaturepdf/master/tests/files/document.pdf">Tester avec un PDF de démo</a>
                </div>
            </div>
        </div>
        <footer class="text-center text-muted mb-2 fixed-bottom">
            <small>Logiciel libre sous license AGPL-3.0 : <a href="https://github.com/24eme/signaturepdf">voir le code source</a></small>
        </footer>
    </div>
    <div id="page-signature" style="padding-right: 350px;" class="d-none">
        <div style="height: 65px;" class="d-md-none"></div>
        <div id="container-pages" class="col-12 pt-1 pb-1 text-center vh-100">
        </div>
        <div style="height: 55px;" class="d-md-none"></div>
        <div class="offcanvas offcanvas-end show d-none d-md-block shadow-sm" data-bs-backdrop="false" data-bs-scroll="true" data-bs-keyboard="false" tabindex="-1" id="sidebarTools" aria-labelledby="sidebarToolsLabel">
            <a class="btn btn-close btn-sm position-absolute opacity-25 d-none d-sm-none d-md-block" title="Fermer ce PDF et retourner à l'accueil" style="position: absolute; top: 2px; right: 2px; font-size: 10px;" href="/signature"></a>
            <div class="offcanvas-header mb-0 pb-0">
                <h5 class="mb-1 d-block w-100" id="sidebarToolsLabel">Signature du PDF <?php if(isset($hash)): ?><span class="float-end small me-2" title="Ce PDF est partagé avec d'autres personnes pour être signé à plusieurs"><span class="nblayers"></span> <i class="bi bi-people-fill"></i></span><?php else: ?><span class="float-end me-2" title="Ce PDF est stocké sur votre ordinateur pour être signé par vous uniquement"><i class="bi bi-person-workspace"></i></span><?php endif; ?></h5>
                <button type="button" class="btn-close text-reset d-md-none" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body pt-0">
                <p id="text_document_name" class="text-muted" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" title=""><i class="bi bi-files"></i> <span></span></p>
                <div class="form-check form-switch mb-2 small d-none">
                  <input class="form-check-input" type="checkbox" id="add-lock-checkbox" disabled="disabled">
                  <label style="cursor: pointer;" class="form-check-label" for="add-lock-checkbox"> Garder la séléction active</label>
                </div>
              <div id="svg_list_signature" class="list-item-add"></div>
              <div class="d-grid gap-2 mb-2 list-item-add">
                  <input type="radio" class="btn-check" id="radio_svg_signature_add" name="svg_2_add" autocomplete="off" value="signature">
                  <label data-bs-toggle="modal" data-bs-target="#modalAddSvg" data-type="signature" class="btn btn-outline-secondary text-black text-start btn-add-svg-type" for="radio_svg_signature_add" id="label_svg_signature_add"><i class="bi bi-vector-pen"></i> Signature <small class="text-muted float-end">Créer</small></label>
              </div>
              <div id="svg_list_initials" class="list-item-add"></div>
              <div class="d-grid gap-2 mb-2 list-item-add">
                  <input type="radio" class="btn-check" id="radio_svg_initials_add" name="svg_2_add" autocomplete="off" value="intials">
                  <label data-bs-toggle="modal" data-bs-target="#modalAddSvg" data-type="initials" data-modalnav="#nav-type-tab" class="btn btn-outline-secondary text-black text-start btn-add-svg-type" for="radio_svg_initials_add" id="label_svg_initials_add"><i class="bi bi-type"></i> Paraphe <small class="text-muted float-end">Créer</small></label>
              </div>
              <div id="svg_list_rubber_stamber" class="list-item-add"></div>
              <div class="d-grid gap-2 mb-2 list-item-add">
                  <input type="radio" class="btn-check" id="radio_svg_rubber_stamber_add" name="svg_2_add" autocomplete="off" value="rubber_stamber">
                  <label data-bs-toggle="modal" data-bs-target="#modalAddSvg" data-type="rubber_stamber" data-modalnav="#nav-import-tab" class="btn btn-outline-secondary text-black text-start btn-add-svg-type" for="radio_svg_rubber_stamber_add" id="label_svg_rubber_stamber_add"><i class="bi bi-card-text"></i> Tampon <small class="text-muted float-end">Créer</small></label>
              </div>
              <div class="d-grid gap-2 mb-2 list-item-add">
                  <input type="radio" class="btn-check" id="radio_svg_text" data-svg="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0iYmkgYmktdGV4dGFyZWEtdCIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBkPSJNMS41IDIuNUExLjUgMS41IDAgMCAxIDMgMWgxMGExLjUgMS41IDAgMCAxIDEuNSAxLjV2My41NjNhMiAyIDAgMCAxIDAgMy44NzRWMTMuNUExLjUgMS41IDAgMCAxIDEzIDE1SDNhMS41IDEuNSAwIDAgMS0xLjUtMS41VjkuOTM3YTIgMiAwIDAgMSAwLTMuODc0VjIuNXptMSAzLjU2M2EyIDIgMCAwIDEgMCAzLjg3NFYxMy41YS41LjUgMCAwIDAgLjUuNWgxMGEuNS41IDAgMCAwIC41LS41VjkuOTM3YTIgMiAwIDAgMSAwLTMuODc0VjIuNUEuNS41IDAgMCAwIDEzIDJIM2EuNS41IDAgMCAwLS41LjV2My41NjN6TTIgN2ExIDEgMCAxIDAgMCAyIDEgMSAwIDAgMCAwLTJ6bTEyIDBhMSAxIDAgMSAwIDAgMiAxIDEgMCAwIDAgMC0yeiIvPjxwYXRoIGQ9Ik0xMS40MzQgNEg0LjU2Nkw0LjUgNS45OTRoLjM4NmMuMjEtMS4yNTIuNjEyLTEuNDQ2IDIuMTczLTEuNDk1bC4zNDMtLjAxMXY2LjM0M2MwIC41MzctLjExNi42NjUtMS4wNDkuNzQ4VjEyaDMuMjk0di0uNDIxYy0uOTM4LS4wODMtMS4wNTQtLjIxLTEuMDU0LS43NDhWNC40ODhsLjM0OC4wMWMxLjU2LjA1IDEuOTYzLjI0NCAyLjE3MyAxLjQ5NmguMzg2TDExLjQzNCA0eiIvPjwvc3ZnPgo=" name="svg_2_add" autocomplete="off" value="text">
                  <label draggable="true" id="label_svg_text" class="btn btn-outline-secondary text-black text-start btn-svg" for="radio_svg_text"><i class="bi bi-textarea-t"></i> Texte</label>
              </div>
              <div class="d-grid gap-2 mb-2 list-item-add">
                  <input type="radio" class="btn-check" id="radio_svg_check" data-height="18" name="svg_2_add" autocomplete="off" value="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0iYmkgYmktY2hlY2stbGciIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHBhdGggZD0iTTEyLjczNiAzLjk3YS43MzMuNzMzIDAgMCAxIDEuMDQ3IDBjLjI4Ni4yODkuMjkuNzU2LjAxIDEuMDVMNy44OCAxMi4wMWEuNzMzLjczMyAwIDAgMS0xLjA2NS4wMkwzLjIxNyA4LjM4NGEuNzU3Ljc1NyAwIDAgMSAwLTEuMDYuNzMzLjczMyAwIDAgMSAxLjA0NyAwbDMuMDUyIDMuMDkzIDUuNC02LjQyNWEuMjQ3LjI0NyAwIDAgMSAuMDItLjAyMloiLz4KPC9zdmc+Cg==">
                  <label draggable="true" id="label_svg_check" class="btn btn-outline-secondary text-black text-start btn-svg" for="radio_svg_check"><i class="bi bi-check-square"></i> Case à cocher</label>
              </div>
              <div id="svg_list" class="d-grid gap-2 mt-2 mb-2 list-item-add"></div>

              <div class="d-grid gap-2 mt-2">
                  <button type="button" id="btn-add-svg" class="btn btn-sm btn-light" data-bs-toggle="modal" data-bs-target="#modalAddSvg"><i class="bi bi-plus-circle"></i> Créer un élément</button>
              </div>
              <div id="form_block" class="position-absolute bottom-0 pb-2 ps-0 pe-4 w-100">
                  <?php if(!isset($hash)): ?>
                  <?php if(!isset($noSharingMode)): ?>
                  <form id="form_sharing" action="/share" method="post" enctype="multipart/form-data">
                        <input id="input_pdf_share" name="pdf" type="file" class="d-none" />
                        <input id="input_svg_share" name="svg[]" type="file" class="d-none" />
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-dark w-100" type="submit" id="save_share"><i class="bi bi-share"></i> Partager pour signer <i class="bi bi-people-fill"></i> à plusieurs </button>
                        </div>
                  </form>
                <?php endif; ?>
                  <form id="form_pdf" action="/sign" method="post" enctype="multipart/form-data" class="d-none d-sm-none d-md-block">
                        <input id="input_pdf" name="pdf" type="file" class="d-none" />
                        <input id="input_svg" name="svg[]" type="file" class="d-none" />
                        <button class="btn btn-primary w-100 mt-2" disabled="disabled" type="submit" id="save"><i class="bi bi-download"></i> Télécharger le PDF signé</button>
                  </form>
                <?php elseif(!isset($noSharingMode)): ?>
                  <div class="d-none d-sm-none d-md-block">
                  <p id="nblayers_text" class="small d-none mb-2 opacity-75">Vous êtes <span class="badge rounded-pill border border-dark text-dark"><span class="nblayers">0</span> <i class="bi bi-people-fill"></i></span> à avoir signé ce PDF</p></div>
                  <div class="btn-group w-100">
                      <a id="btn_download" class="btn btn-outline-dark w-100" href="/signature/<?php echo $hash ?>/pdf"><i class="bi bi-download"></i> Télécharger le PDF</a>
                      <button class="btn btn-outline-dark" type="button" id="btn_share" data-bs-toggle="modal" data-bs-target="#modal-share-informations"><i class="bi bi-share"></i></button>
                  </div>
                  <form id="form_pdf" action="/signature/<?php echo $hash ?>/save" method="post" enctype="multipart/form-data" class="d-none d-sm-none d-md-block">
                        <input id="input_svg" name="svg[]" type="file" class="d-none" />
                        <button class="btn btn-primary w-100 mt-2" disabled="disabled" type="submit" id="save"><i class="bi bi-cloud-upload"></i> Transmettre ma signature</button>
                  </form>
                  <?php endif; ?>
              </div>
            </div>
        </div>
        <div class="position-fixed top-0 start-0 bg-white w-100 p-2 shadow-sm d-md-none">
            <div class="d-grid gap-2">
            <button id="btn_svn_select" class="btn btn-light btn-lg" data-bs-toggle="offcanvas" data-bs-target="#sidebarTools" aria-controls="sidebarTools"><i class="bi bi-hand-index"></i> Séléctionner une signature</button>
            </div>
            <div id="svg_selected_container" class="text-center d-none position-relative">
                <img id="svg_selected" src="" style="height: 48px;" class="img-fluid"/>
                <button type="button" id="btn_svg_selected_close" class="btn-close text-reset position-absolute" style="top: 9px; right: 9px;"></button>
            </div>
            <div id="svg_object_actions" class="d-none">
                <button id="btn-svg-pdf-delete" class="btn btn-lg btn-light"><i class="bi bi-trash"></i></button>
            </div>
        </div>
        <div class="position-fixed bottom-0 start-0 bg-white w-100 p-2 shadow d-md-none">
            <div class="btn-group position-absolute opacity-25" style="top: -46px;">
            <button id="btn-zoom-decrease" class="btn btn-secondary"><i class="bi bi-dash"></i></button>
            <button id="btn-zoom-increase" class="btn btn-secondary"><i class="bi bi-plus"></i></button>
            </div>
            <div class="d-grid gap-2">
                <?php if(isset($hash)): ?>
                    <button class="btn btn-primary" disabled="disabled" type="submit" id="save_mobile"><i class="bi bi-cloud-upload"></i> Transmettre ma signature</button>
                <?php else: ?>
                    <button class="btn btn-primary" disabled="disabled" type="submit" id="save_mobile"><i class="bi bi-download"></i> Télécharger le PDF signé</button>
                <?php endif; ?>
            </div>
        </div>

    <div class="modal fade" id="modalAddSvg" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-body">
                <nav>
                    <div class="nav nav-tabs" id="nav-tab" role="tablist">
                    <button class="nav-link active" id="nav-draw-tab" data-bs-toggle="tab" data-bs-target="#nav-draw" type="button" role="tab" aria-controls="nav-draw" aria-selected="true"><i class="bi bi-vector-pen"></i> Dessiner</button>
                    <button class="nav-link" id="nav-type-tab" data-bs-toggle="tab" data-bs-target="#nav-type" type="button" role="tab" aria-controls="nav-type" aria-selected="false"><i class="bi bi-fonts"></i> Saisir</button>
                    <button class="nav-link" id="nav-import-tab" data-bs-toggle="tab" data-bs-target="#nav-import" type="button" role="tab" aria-controls="nav-import" aria-selected="false"><i class="bi bi-image"></i> Importer</button>
                    </div>
                </nav>
                <div class="tab-content mt-3" id="nav-svg-add">
                    <div class="tab-pane fade show active" id="nav-draw" role="tabpanel" aria-labelledby="nav-draw-tab">
                      <small id="signature-pad-reset" class="text-muted opacity-75 position-absolute" style="right: 25px; bottom: 25px; cursor: pointer;" title="Effacer la signature"><i class="bi bi-trash"></i></small>
                      <canvas id="signature-pad" class="border bg-light" width="462" height="200"></canvas>
                    </div>
                    <div class="tab-pane fade" id="nav-type" role="tabpanel" aria-labelledby="nav-type-tab">
                        <input id="input-text-signature" type="text" class="form-control form-control-lg" placeholder="Ma signature" />
                    </div>
                    <div class="tab-pane fade" id="nav-import" role="tabpanel" aria-labelledby="nav-import-tab">
                        <div class="text-center">
                        <img id="img-upload" class="d-none" src="" />
                        </div>
                        <form id="form-image-upload" action="/image2svg" method="POST" enctype="multipart/form-data">
                        <input id="input-image-upload" class="form-control" name="image" type="file">
                        </form>
                </div>
                </div>
                <input id="input-svg-type" type="hidden" />
          </div>
          <div class="modal-footer">
            <button tabindex="-1" type="button" class="btn btn-light" data-bs-dismiss="modal">Annuler</button>
            <button id="btn_modal_ajouter" type="button" disabled="disabled" class="btn btn-primary" data-bs-dismiss="modal"><span id="btn_modal_ajouter_spinner" class="spinner-border spinner-border-sm d-none"></span><span id="btn_modal_ajouter_check" class="bi bi-check-circle"></span> Ajouter</button>
          </div>
        </div>
      </div>
    </div>
    </div>
    <?php if(isset($hash)): ?>
    <div id="modal-share-informations" class="modal" tabindex="-1">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-people-fill"></i> Signer ce PDF à plusieurs</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Plusieurs personnes peuvent signer ce PDF en même temps sur cette page.</p>
                    <div class="input-group mb-3">
                        <span class="input-group-text">Lien à partager</span>
                        <input id="input-share-link" type="text" onclick="this.select();  this.setSelectionRange(0, 99999);" readonly="readonly" class="form-control bg-light font-monospace" value="">
                        <button onclick="navigator.clipboard.writeText(document.getElementById('input-share-link').value); this.innerText = 'Copié !';" autofocus="autofocus" class="btn btn-primary" type="button" id="btn-copy-share-link"><i class="bi bi-clipboard"></i> Copier</button>
                        <script>document.querySelector('#input-share-link').value = document.location.href.replace(/#.*/, '');</script>
                    </div>
                    <p>C'est aussi depuis cette page qu'il est possible de télécharger le PDF signé par tout le monde.</p>
                </div>
                <div class="modal-footer text-start">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Fermer</button>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>
    <?php if(isset($hash)): ?>
    <div id="modal-signed" class="modal" tabindex="-1">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-file-earmark-check"></i> PDF signé</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-1"><i class="bi bi-check-circle text-success"></i> Votre signature a bien été prise en compte&nbsp;!</p>
                </div>
                <div class="modal-footer text-center d-block">
                    <a class="btn btn-outline-dark" href="/signature/<?php echo $hash ?>/pdf"><i class="bi bi-download"></i> Télécharger le PDF</a>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <span id="is_mobile" class="d-md-none"></span>

    <script src="/vendor/bootstrap.min.js?5.1.3"></script>
    <script src="/vendor/pdf.js?legacy"></script>
    <script src="/vendor/fabric.min.js?4.6.0"></script>
    <script src="/vendor/signature_pad.umd.min.js?3.0.0-beta.3"></script>
    <script src="/vendor/opentype.min.js?1.3.3"></script>
    <script>
    var maxSize = <?php echo $maxSize ?>;
    var maxPage = <?php echo $maxPage ?>;
    var hash = null;
    <?php if(isset($hash)): ?>
    hash = "<?php echo $hash ?>";
    <?php endif; ?>
    </script>
    <script src="/js/signature.js?202204020154"></script>
  </body>
</html>
