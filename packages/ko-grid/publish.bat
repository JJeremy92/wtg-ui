pushd %~dp0
set outdir=..\..\..\..\Bin\ko-grid

if exist %outdir% rmdir %outdir% /s /q || goto :error
mkdir %outdir% || goto :error

xcopy package.json %outdir% || goto :error
xcopy dist\ko-grid.css %outdir%\dist\ || goto :error
xcopy dist\ko-grid.js %outdir%\dist\ || goto :error
xcopy dist\ko-grid.js.map %outdir%\dist\ || goto :error
xcopy dist\types %outdir%\dist\types\ /s || goto :error

popd
exit /b 0

:error
exit /b %errorlevel%
