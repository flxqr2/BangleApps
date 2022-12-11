const {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
  memo,
  forwardRef,
  Fragment,
} = React;

const bpps = {
  1: '1bit',
  2: '2bitbw',
  3: '3bit',
  4: '4bitmac',
  8: 'web',
  16: 'rgb565',
};

const diffusions = {
  none: 'Nearest color (flat)',
  random1: 'Random small',
  random2: 'Random large',
  error: 'Error Diffusion',
  errorrandom: 'Randomised Error Diffusion',
  bayer2: '2x2 Bayer',
  bayer4: '4x4 Bayer',
};

const checksum = (s) => {
  if (!s) return null;
  var chk = 0x12345678;
  var len = s.length;
  for (var i = 0; i < len; i++) {
    chk += s.charCodeAt(i) * (i + 1);
  }
  return (chk & 0xffffffff).toString(16);
};

const uid = () => {
  const ff = (s) => {
    const pt = (Math.random().toString(16) + '000000000').substr(2, 8);
    return s ? '-' + pt.substr(0, 4) + '-' + pt.substr(4, 4) : pt;
  };
  return ff() + ff(true) + ff(true) + ff();
};

const ViewOnBangleButton = memo(({ data, ...props }) => {
  const onClick = useCallback(() => {
    UART.eval('load(null)', () => {});
    UART.eval(
      `g.setColor(0x000000).setBgColor(0xFFFFFF).clear().drawImage(require("heatshrink").decompress(atob("${data}")));`,
      () => {}
    );
  }, [data]);
  return (
    <button className="button-full" onClick={onClick} {...props}>
      View on Bangle
    </button>
  );
});

const useFormField = ({ initial, key, onChange }) => {
  const [value, setValue] = useState(initial);
  const onChangeField = useCallback(
    (evt) => {
      setValue(evt.target.value);
    },
    [setValue]
  );

  useEffect(() => {
    onChange(key, value);
  }, [onChange, key, value]);

  return {
    name: key,
    value,
    onChange: onChangeField,
  };
};

const Hr = (props) => (
  <div
    style={{
      minHeight: '0.8rem',
      marginBottom: '1rem',
      boxShadow: '0 2px 4px -3px black',
    }}
    {...props}
  />
);

const UploadField = ({ onAddImage }) => {
  const onChange = useCallback(
    (evt) => {
      const files = evt.target.files;
      for (const file of files) {
        if (file.type.indexOf('image/') === 0) {
          onAddImage(file);
        }
      }
    },
    [onAddImage]
  );
  return (
    <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <input type="file" onChange={onChange} />
    </div>
  );
};

const DropZone = ({ onAddImage }) => {
  const onDragOver = useCallback((evt) => {
    evt.preventDefault();
  }, []);

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const files = (
        evt.dataTransfer.items
          ? [...evt.dataTransfer.items].map((item) =>
              item.kind === 'file' ? item.getAsFile() : null
            )
          : [...evt.dataTransfer.files]
      ).filter((it) => !!it && it.type.indexOf('image') === 0);
      files.forEach((file) => onAddImage(file));
    },
    [onAddImage]
  );

  return (
    <div
      className="container"
      style={{
        position: 'sticky',
        bottom: 0,
      }}
    >
      <label
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          margin: 0,
          padding: '2rem',
          background: 'rgb(198 243 172)',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: 'black 0px -3px 4px -4px',
          cursor: 'pointer',
        }}
      >
        Drop image files <u>here</u> or click to add images
        <UploadField onAddImage={onAddImage} />
      </label>
    </div>
  );
};

const SvgFile = ({ file }) => {
  const [svg, setSvg] = useState();

  useEffect(() => {
    file.text().then(setSvg);
  }, [file, setSvg]);

  // convert a svg's paths to animatable vectors
  const positions = useMemo(() => {
    if (!svg) return [];

    const div = document.createElement('div');
    div.innerHTML = svg;

    const positions = [];
    div.querySelectorAll('path').forEach((node) => {
      const pos = [];

      const len = node.getTotalLength();
      for (let i = 0; i < len; i += 4) {
        const p = node.getPointAtLength(i);

        if (
          i === 0 ||
          i === len - 1 ||
          Math.abs(
            Math.sqrt(
              Math.pow(Math.abs(p.x - pos[pos.length - 1][0]), 2),
              Math.pow(Math.abs(p.y - pos[pos.length - 1][1]), 2)
            )
          ) > 1.0
        ) {
          pos.push([Math.round(p.x), Math.round(p.y)]);
        }
      }
      positions.push(pos);
    });
    return positions;
  }, [svg]);

  return <Code>{JSON.stringify(positions)}</Code>;
};

const Code = (props) => (
  <pre>
    <code className="code-content" {...props} />
  </pre>
);

const ImageSettings = memo(({ data, onChange }) => {
  const contrast = useFormField({ initial: 0, key: 'contrast', onChange });
  const brightness = useFormField({ initial: 0, key: 'brightness', onChange });
  const mode = useFormField({
    initial: bpps[1],
    key: 'mode',
    onChange,
  });
  const diffusion = useFormField({
    initial: diffusions.none,
    key: 'diffusion',
    onChange,
  });

  return (
    <form>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '.4rem',
        }}
      >
        <div
          style={{
            flex: '1 1 auto',
          }}
        >
          <label htmlFor="inp-contrast">Contrast</label>
          <input
            style={{ width: '100%' }}
            id="inp-contrast"
            {...contrast}
            type="range"
            min="-255"
            max="255"
            step="0.001"
          />
        </div>
        <div
          style={{
            flex: '1 1 auto',
          }}
        >
          <label htmlFor="inp-brightness">Brightness</label>
          <input
            style={{ width: '100%' }}
            id="inp-brightness"
            {...brightness}
            type="range"
            min="-255"
            max="255"
            step="0.001"
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '.4rem',
        }}
      >
        <div>
          <label htmlFor="inp-mode">Mode</label>
          <select id="inp-mode" {...mode}>
            {Object.keys(bpps).map((k) => (
              <option key={k}>{bpps[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inp-diffusion">Diffusion</label>
          <select id="inp-diffusion" {...diffusion}>
            {Object.keys(diffusions).map((k) => (
              <option key={k} value={k}>
                {diffusions[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inp-size">Size (bytes)</label>
          <input readOnly id="inp-size" value={data.length} />
        </div>
      </div>
    </form>
  );
});

const ImageFile = forwardRef(({ file, onAddToAlbum, removeImage }, ref) => {
  const img = useRef();
  const canvas = useRef();

  const [data, setData] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    compression: true,
    updateCanvas: true,
    output: 'raw',
  });
  const src = useMemo(() => URL.createObjectURL(file), [file]);

  const onChangeSettings = useCallback(
    (key, val) => {
      setSettings((settings) => ({ ...settings, [key]: val }));
    },
    [setSettings]
  );

  useEffect(() => {
    if (!loaded) return;
    const ctx = canvas.current.getContext('2d');

    var hRatio = canvas.current.width / img.current.width;
    var vRatio = canvas.current.height / img.current.height;
    var ratio = Math.min(hRatio, vRatio);
    var centerShift_x = (canvas.current.width - img.current.width * ratio) / 2;
    var centerShift_y =
      (canvas.current.height - img.current.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.drawImage(
      img.current,
      0,
      0,
      img.current.width,
      img.current.height,
      centerShift_x,
      centerShift_y,
      img.current.width * ratio,
      img.current.height * ratio
    );

    setData(btoa(imageconverter.canvastoString(canvas.current, settings)));
  }, [setData, canvas, img, file, settings, loaded]);

  return (
    <article
      ref={ref}
      style={{ padding: '.4rem', borderTop: '1px solid #ccc' }}
    >
      <h1 style={{ margin: 0, fontSize: '100%' }}>{file.name}</h1>
      <div style={{ display: 'flex', gap: '.4rem' }}>
        <div>
          <img
            src={src}
            onLoad={() => setLoaded(true)}
            style={{ width: '176px', height: 'auto' }}
          />
          <div style={{ overflow: 'hidden' }}>
            <img
              src={src}
              ref={img}
              onLoad={() => setLoaded(true)}
              style={{ position: 'absolute', display: 'none' }}
            />
          </div>
        </div>
        <div>
          <canvas ref={canvas} width={176} height={176} />
        </div>
      </div>
      <ImageSettings onChange={onChangeSettings} data={data} />
      {!!data && (
        <p style={{ display: 'flex', gap: '.4rem' }}>
          <ViewOnBangleButton data={data} />
          <button
            onClick={() => {
              onAddToAlbum({ name: file.name, data });
              removeImage(file);
            }}
          >
            Add to album
          </button>
        </p>
      )}
    </article>
  );
});

const ListEntry = ({ file, onAddToAlbum, removeImage }) => {
  const ref = useRef();
  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [ref, file]);

  const isSvg = useMemo(() => file.type === 'image/svg+xml', [file.type]);
  return isSvg ? (
    <SvgFile file={file} ref={ref} />
  ) : (
    <ImageFile
      ref={ref}
      file={file}
      onAddToAlbum={onAddToAlbum}
      removeImage={removeImage}
    />
  );
};

const showDebug = false;
const BangleConnect = ({
  albums,
  setAlbums,
  setBangleQueried,
  bangleQueried,
}) => {
  const checksums = useRef({
    current: checksum(JSON.stringify([])),
    original: checksum(JSON.stringify([])),
  });
  const [storageStats, setStorageStats] = useState();

  const convertToBangleJson = useCallback((albums) => {
    // sequential image data
    const newFiles = [];
    // deletable files
    const deleteFiles = [];
    const jsonData = albums
      .map((album) => {
        // let's ignore empty albums
        if (!album.images || !album.images.length) return null;

        const ids = [];
        return {
          ...album,
          images: album.images
            .map((image) => {
              if (image.removed) {
                deleteFiles.push(image.fileName);
                return null;
              }
              // let's ignore duplicate ids
              if (ids.includes(image.id)) {
                return null;
              }
              ids.push(image.id);

              if (image.data) {
                newFiles.push({
                  name: `albums.data.${album.id}.${image.id}`,
                  data: image.data,
                });
              }

              return {
                id: image.id,
                name: image.name,
              };
            })
            .filter((i) => !!i),
        };
      })
      .filter((a) => !!a);

    return { newFiles, deleteFiles, jsonData };
  }, []);

  // let's convert album info to data for bangle
  const { jsonFile, newFiles, deleteFiles } = useMemo(() => {
    const { newFiles, jsonData, deleteFiles } = convertToBangleJson(albums);
    const json = JSON.stringify(jsonData);

    checksums.current.current = checksum(json);

    return {
      jsonFile: json,
      newFiles,
      deleteFiles,
    };
  }, [albums, convertToBangleJson]);

  // read json file from bangle
  const getBangleData = useCallback(() => {
    UART.eval(
      'require("Storage").readJSON("albums.json.data")',
      (albums, err) => {
        if (err) {
          console.error(err);
          console.error('could not get albums json data file from bangle');
          return;
        }

        const _albums = albums
          .map((album) => {
            return !album || !album.images || !album.images.length
              ? null
              : {
                  ...album,
                  images: album.images
                    .map((image) =>
                      !image
                        ? null
                        : {
                            ...image,
                          }
                    )
                    .filter((i) => !!i),
                };
          })
          .filter((a) => !!a);

        checksums.current.original = checksum(JSON.stringify(_albums));

        setAlbums(
          _albums.map((a) => ({
            ...a,
            images: a.images.map((i) => ({
              ...i,
              fileName: `albums.data.${a.id}.${i.id}`,
            })),
          }))
        );
        setBangleQueried(true);

        UART.eval('require("Storage").getStats()', (data) => {
          setStorageStats(data);
        });
      }
    );
  }, [
    checksums,
    setAlbums,
    setStorageStats,
    setBangleQueried,
    convertToBangleJson,
  ]);

  const writeBangleData = useCallback(async () => {
    UART.eval(
      `require("Storage").write("albums.json.data",'${jsonFile}');`,
      (data) => {
        console.log('wrote json data', data);

        // if we have data on our image object, we need to store it
        // otherwise the file should be be sored on bangle already
        const js =
          newFiles
            .map(
              ({ name, data }) =>
                !!data && `require('Storage').write('${name}', '${data}')`
            )
            .join(';') +
          deleteFiles
            .map(
              ({ fileName }) =>
                !!fileName && `require('Storage').erase('${fileName}')`
            )
            .join(';');

        UART.eval(js, (data) => {
          console.log('done');
          // let's get data from bangle to make sure that everything is in sync
          getBangleData();
        });
      }
    );
  }, [jsonFile, newFiles, deleteFiles, getBangleData]);

  return (
    <Fragment>
      <div
        style={{
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'white',
        }}
      >
        <button className="button-full" onClick={getBangleData}>
          Get albums from Bangle
        </button>
        {!!bangleQueried && (
          <Fragment>
            <div style={{ flex: '1 1 100%' }} />
            <button
              disabled={
                checksums.current.original === checksums.current.current
              }
              style={{ marginLeft: 'auto', display: 'block' }}
              onClick={writeBangleData}
            >
              Upload
            </button>
          </Fragment>
        )}
      </div>
      <section className="container">
        {!!storageStats && (
          <section>
            <h6 style={{ margin: 0 }}>Bangle Storage: </h6>

            <div
              style={{
                display: 'flex',
                background: 'red',
                height: '2px',
                margin: '0 0 2.5rem 0',
              }}
              title={`free space: ${
                (100 / storageStats.totalBytes) * storageStats.freeBytes
              }%`}
            >
              <div
                style={{
                  flex: `0 0 ${
                    (100 / storageStats.totalBytes) * storageStats.freeBytes
                  }%`,
                  background: 'green',
                  marginLeft: 'auto',
                }}
              />
            </div>
          </section>
        )}
        {!!showDebug && !!bangleQueried && (
          <section>
            <h5 style={{ margin: 0 }}>Sync data: </h5>
            <Code>{JSON.stringify(checksums)}</Code>
            <Code>{jsonFile}</Code>
            <Code>{JSON.stringify(newFiles)}</Code>
            <Code>{JSON.stringify(deleteFiles)}</Code>
          </section>
        )}
      </section>
    </Fragment>
  );
};

const AlbumImage = ({ id, data, name, removed, fileName, removeFromAlbum }) => {
  const [loading, setLoading] = useState(true);
  const [bangleData, setBangleData] = useState(null);
  const [url, setUrl] = useState(null);

  // let's load image data from bangle if there is no data from album info (i.e. when displaying a new image frmoo upload field)
  useEffect(() => {
    if (data) return;
    setLoading(true);
    setBangleData(null);
    UART.eval(`require("Storage").read("${fileName}")`, (data, error) => {
      if (!data || error) {
        console.error(error);
        return;
      }
      setBangleData(data);
    });
  }, [fileName, data, setBangleData, setLoading]);

  // let's convert our compressed espruino image to an url resource
  useEffect(() => {
    if (!data && !bangleData) {
      setUrl(null);
      return;
    }
    try {
      const buffer = new Uint8Array(
        atob(data || bangleData)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      const rawData = heatshrink.decompress(buffer);
      let str = '';
      for (let n = 0; n < rawData.length; n++)
        str += String.fromCharCode(rawData[n]);
      const url = imageconverter.stringToImageURL(str);
      setUrl(url);
    } catch (err) {
      console.error(err.message);
    }
    setLoading(false);
  }, [data, bangleData, setUrl, setLoading]);

  const onClickRemove = useCallback(
    () => removeFromAlbum({ id }),
    [id, removeFromAlbum]
  );

  return (
    <div
      style={{
        padding: '.4em 0',
        borderTop: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {loading ? (
        <div
          style={{
            flex: '1 1 auto',
            height: '176px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          loading {name} …
        </div>
      ) : (
        <Fragment>
          <img
            src={url}
            alt={name}
            title={name}
            width="176"
            height="176"
            style={{ opacity: removed ? 0.5 : 1 }}
          />
          <div style={{ flex: '0 0 4rem' }}>
            {!!(data || bangleData) && (
              <ViewOnBangleButton data={data || bangleData} />
            )}
            <button className="button-full" onClick={onClickRemove}>
              {removed ? 'Undelete' : 'Delete'}
            </button>
          </div>
        </Fragment>
      )}
    </div>
  );
};
const Album = ({ setAlbums, removeFromAlbum, id, name, images }) => {
  const ref = useRef();
  useEffect(() => {
    if (name === 'new') {
      ref.current.focus();
      ref.current.select();
    }
  }, [id, ref, name]);

  return (
    <section className="container">
      <label htmlFor="input_name">Name</label>
      <input
        ref={ref}
        id="input_name"
        value={name}
        onChange={(evt) => {
          setAlbums((albums) =>
            albums.map((a) =>
              a.id === id ? { ...a, name: evt.target.value } : { ...a }
            )
          );
        }}
      />
      {!!images &&
        images.map((image) => (
          <AlbumImage
            key={image.id}
            id={image.id}
            data={image.data}
            name={image.name}
            removed={image.removed}
            fileName={image.fileName}
            removeFromAlbum={removeFromAlbum}
          />
        ))}
    </section>
  );
};

const AlbumButton = ({ name, isCurrent, ...props }) => {
  const ref = useRef();
  useEffect(() => {
    if (!isCurrent) return;
    requestAnimationFrame(() => {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [ref, isCurrent]);

  return (
    <button
      ref={ref}
      style={{ margin: '0 .2rem' }}
      disabled={isCurrent}
      {...props}
    >
      {name}
    </button>
  );
};

const Main = () => {
  const [bangleQueried, setBangleQueried] = useState(false);
  const [images, setImages] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [currentAlbum, setCurrentAlbum] = useState();

  // let's select the first available album
  useEffect(() => {
    if (currentAlbum || !albums || !albums.length) return;
    setCurrentAlbum(albums[0].id);
  }, [albums, currentAlbum, setCurrentAlbum]);

  // cb to add an image file to images list from uploadd field / drop zone
  const addImage = useCallback(
    (image) => {
      setImages((images) => [
        ...images.filter((i) => i.name !== image.name),
        image,
      ]);
    },
    [setImages]
  );

  // cb to remove an image file from images list
  const removeImage = useCallback(
    (image) => {
      setImages((images) => [...images.filter((i) => i.name !== image.name)]);
    },
    [setImages]
  );

  // cb to add an image from images list to current album
  const onAddToAlbum = useCallback(
    ({ name, data }) => {
      setAlbums((prev) =>
        prev.map((album) => {
          if (album.id !== currentAlbum) return { ...album };
          let id = 1;
          while (album.images.find((i) => i.id === id)) {
            id++;
          }

          return { ...album, images: [...album.images, { id, name, data }] };
        })
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  const removeFromAlbum = useCallback(
    ({ id }) => {
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === currentAlbum
            ? {
                ...album,
                images: album.images
                  .map((img) =>
                    img.id === id
                      ? img.data
                        ? null //  if not yet stored on bangle, remoove immediately
                        : { ...img, removed: !img.removed } // set removed flag to delete file on bangle
                      : { ...img }
                  )
                  .filter((i) => !!i),
              }
            : album
        )
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  const createAlbum = useCallback(() => {
    setAlbums((albums) => {
      let id = 1;
      while (albums.find((a) => a.id === id)) {
        id++;
      }
      setCurrentAlbum(id);
      return [...albums, { id, name: 'new', images: [] }];
    });
  }, [setAlbums, setCurrentAlbum]);

  return (
    <main>
      <BangleConnect
        setAlbums={setAlbums}
        setCurrentAlbum={setCurrentAlbum}
        albums={albums}
        setBangleQueried={setBangleQueried}
        bangleQueried={bangleQueried}
      />

      {bangleQueried && (
        <div>
          <nav
            style={{
              position: 'sticky',
              top: '-1.8rem',
              zIndex: 2,
              boxShadow: '0 2px 4px -3px black',
            }}
          >
            <div className="container">
              <h2>Albums</h2>
              <div
                style={{
                  display: 'flex',
                  overflow: 'auto',
                  background: 'white',
                  margin: '0 -.2rem',
                  padding: '.2rem 0',
                }}
              >
                {albums.map(({ id, name }) => (
                  <AlbumButton
                    key={id}
                    name={name}
                    isCurrent={currentAlbum === id}
                    onClick={() => {
                      setCurrentAlbum(id);
                    }}
                  />
                ))}
                <button
                  style={{
                    position: 'sticky',
                    right: '.2em',
                    margin: '0 .2em',
                    marginLeft: 'auto',
                  }}
                  onClick={createAlbum}
                >
                  Create Album
                </button>
              </div>
            </div>
          </nav>
          {!!currentAlbum && (
            <Album
              setAlbums={setAlbums}
              removeFromAlbum={removeFromAlbum}
              {...albums.find((a) => a.id === currentAlbum)}
            />
          )}

          {(1 || !!currentAlbum) && (
            <div className="container">
              <section title="Picture for album">
                {images.map((file) => (
                  <ListEntry
                    key={file.name}
                    file={file}
                    onAddToAlbum={onAddToAlbum}
                    removeImage={removeImage}
                  />
                ))}
              </section>
            </div>
          )}

          <DropZone onAddImage={addImage} />
        </div>
      )}
    </main>
  );
};
const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<Main />);
